/**
 * Runs a library check against POST /api/fetch, in three steps:
 *
 * 1. Cache sweep: sends every id with `cacheOnly`, up to BULK_LIMITS.maxIds
 *    per request, so the progress bar jumps to the share the server has
 *    already saved.
 * 2. Lookups: sends the rest in batches of up to BULK_LIMITS.remoteBatch ids,
 *    one request at a time. The server asks ProtonDB for as many as it can in
 *    about 5 seconds and returns the others as pending, which go out again.
 * 3. One retry round, 2 seconds later, for the ids ProtonDB did not answer
 *    for. Ids that fail again are final.
 *
 * All progress lives in a CheckState. After an error, pass the same state to
 * runCheck again and the check goes on where it stopped.
 *
 * Plain TypeScript without React. Timing uses performance.now(), and only
 * inside runCheck, never while a component renders.
 */

import {
	BULK_LIMITS,
	type BulkLookupRequest,
	type BulkLookupResponse,
	type ProtonSummary,
} from '@/types/proton';

const ENDPOINT = '/api/fetch';
/** Longest time one request may take, reading the body included. */
const REQUEST_TIMEOUT_MS = 30_000;
/** Longest single wait, whatever the server asks for. */
const MAX_WAIT_MS = 30_000;
/** Waits before trying again after a server error, network error or timeout. */
const ERROR_RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;
/** Wait after a 429 without a usable Retry-After header, and the shortest one. */
const BUSY_WAIT_MS = 1_000;
/** This many 429 replies in a row stop the check. */
const MAX_BUSY_REPLIES = 10;
/** This many replies in a row that settle no id stop the check. */
const MAX_STALLED_REPLIES = 5;
/** Pause before the retry round, so a short ProtonDB hiccup can pass. */
const RETRY_ROUND_DELAY_MS = 2_000;
/** The time estimate needs this many lookup replies in the current run... */
const ETA_MIN_REPLIES = 2;
/** ...and this much time since the lookups started. */
const ETA_MIN_ELAPSED_MS = 5_000;
/** Largest app id the API accepts. */
const MAX_APP_ID = 2_147_483_647;

export type CheckState = {
	/** Summaries by app id. */
	results: Map<number, ProtonSummary>;
	/** Ids ProtonDB has no reports for. */
	noReports: Set<number>;
	/** Ids ProtonDB did not answer for. Final once `retried` is true. */
	failed: Set<number>;
	/**
	 * Ids still waiting for an answer, in library order. Once `retried` is
	 * true, this is the retry round.
	 */
	queue: number[];
	/** True once the cache sweep has covered every id. */
	swept: boolean;
	/** True once the lookups are done. From then on failures are final. */
	retried: boolean;
	/** Number of ids in the retry round. 0 until it starts. */
	retryCount: number;
	/** Number of unique, valid ids in the check. */
	total: number;
};

export type CheckPhase = 'sweep' | 'fetch' | 'retry';

/**
 * Why the check is waiting right now: ProtonDB asked to slow down
 * (`throttled`), the server is busy with another request from this visitor
 * (`busy`), or the server did not answer and the request will be sent again
 * (`retrying`).
 */
export type CheckWaiting = null | 'throttled' | 'busy' | 'retrying';

export type CheckProgressEvent = {
	phase: CheckPhase;
	/**
	 * Ids with a final answer: summaries, no reports, and failures after the
	 * retry round. Never goes down, so the progress bar never moves back.
	 */
	done: number;
	total: number;
	/** Estimated time left. Only set during the lookups, once there is data. */
	etaMs: number | null;
	waiting: CheckWaiting;
	/** Number of ids in the retry round. Only set in the `retry` phase. */
	retryCount?: number;
};

export type CheckOutcome =
	| { status: 'done' }
	| { status: 'expired' }
	| { status: 'cancelled' }
	| { status: 'error'; reason: string };

export type RunCheckOptions = {
	/** Aborting it cancels the check. Waits and requests stop right away. */
	signal: AbortSignal;
	/** Called on every change. Never called after the signal aborted. */
	onProgress: (event: CheckProgressEvent) => void;
};

const CANCELLED: CheckOutcome = { status: 'cancelled' };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAppId(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 1 &&
		value <= MAX_APP_ID
	);
}

/**
 * A fresh check for these app ids. Duplicates and ids the API would reject
 * are left out, since one bad id gets a whole batch rejected.
 */
export function createCheckState(appIds: readonly number[]): CheckState {
	const queue = [...new Set(appIds.filter(isAppId))];
	return {
		results: new Map(),
		noReports: new Set(),
		failed: new Set(),
		queue,
		swept: false,
		retried: false,
		retryCount: 0,
		total: queue.length,
	};
}

function phaseOf(state: CheckState): CheckPhase {
	if (!state.swept) return 'sweep';
	return state.retried ? 'retry' : 'fetch';
}

function toEvent(
	state: CheckState,
	phase: CheckPhase,
	waiting: CheckWaiting,
	etaMs: number | null,
): CheckProgressEvent {
	// Failures only count once they are final. Counting them earlier would
	// move the bar back when the retry round takes them up again.
	const settled =
		state.results.size +
		state.noReports.size +
		(state.retried ? state.failed.size : 0);
	const event: CheckProgressEvent = {
		phase,
		done: Math.min(settled, state.total),
		total: state.total,
		etaMs,
		waiting,
	};
	if (phase === 'retry') event.retryCount = state.retryCount;
	return event;
}

/** The progress of a state, as runCheck reports it before its first request. */
export function getCheckProgress(state: CheckState): CheckProgressEvent {
	return toEvent(state, phaseOf(state), null, null);
}

// Timing helpers

/** Resolves true after `ms`, or false as soon as `signal` aborts. Never rejects. */
function sleep(ms: number, signal: AbortSignal): Promise<boolean> {
	return new Promise((resolve) => {
		if (signal.aborted) {
			resolve(false);
			return;
		}
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve(true);
		}, ms);
		function onAbort() {
			clearTimeout(timer);
			resolve(false);
		}
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

type Deadline = {
	/** Aborts when the parent signal aborts or when the time is up. */
	signal: AbortSignal;
	/** True when the time ran out, as opposed to the parent aborting. */
	timedOut: () => boolean;
	/** Stops the timer and the parent listener. Call it when done. */
	dispose: () => void;
};

/**
 * Combines a cancel signal with a timeout. Written by hand because
 * AbortSignal.any only arrived in browsers from 2023 and 2024.
 */
function withDeadline(parent: AbortSignal, ms: number): Deadline {
	const controller = new AbortController();
	let expired = false;
	const abort = () => controller.abort();
	const timer = setTimeout(() => {
		expired = true;
		controller.abort();
	}, ms);
	if (parent.aborted) controller.abort();
	else parent.addEventListener('abort', abort, { once: true });
	return {
		signal: controller.signal,
		timedOut: () => expired,
		dispose: () => {
			clearTimeout(timer);
			parent.removeEventListener('abort', abort);
		},
	};
}

// One run

/** Bookkeeping for one call of runCheck. */
type Run = {
	state: CheckState;
	signal: AbortSignal;
	onProgress: (event: CheckProgressEvent) => void;
	phase: CheckPhase;
	waiting: CheckWaiting;
	/** performance.now() when the lookups started in this run. */
	fetchStartedAt: number | null;
	/** Lookup replies in this run. */
	fetchReplies: number;
	/** Ids the lookups settled in this run, failures included. */
	fetchSettled: number;
};

/**
 * Time left in the lookups, from the rate of this run only, so time spent
 * paused before a resume does not count. Failed ids are included, since the
 * retry round sends them once more.
 */
function estimate(run: Run): number | null {
	if (run.phase !== 'fetch' || run.fetchStartedAt === null) return null;
	if (run.fetchReplies < ETA_MIN_REPLIES || run.fetchSettled === 0) {
		return null;
	}
	const elapsed = performance.now() - run.fetchStartedAt;
	if (elapsed < ETA_MIN_ELAPSED_MS) return null;
	const remaining = run.state.queue.length + run.state.failed.size;
	return Math.round((remaining * elapsed) / run.fetchSettled);
}

function report(run: Run): void {
	// Nothing reaches the page after Cancel.
	if (run.signal.aborted) return;
	run.onProgress(toEvent(run.state, run.phase, run.waiting, estimate(run)));
}

/**
 * Waits while the page shows why. Returns false when the check was cancelled
 * during the wait.
 */
async function wait(
	run: Run,
	ms: number,
	reason: NonNullable<CheckWaiting>,
): Promise<boolean> {
	run.waiting = reason;
	report(run);
	const finished = await sleep(ms, run.signal);
	run.waiting = null;
	if (finished) report(run);
	return finished;
}

// Requests

/** Result of one HTTP request. */
type Attempt =
	| { kind: 'ok'; data: BulkLookupResponse }
	/** 400 or 413: the server will never accept this batch. */
	| { kind: 'rejected' }
	/** 403: the captcha session ran out. */
	| { kind: 'expired' }
	| { kind: 'cancelled' }
	/** 429: another request from this visitor is still running. */
	| { kind: 'busy'; waitMs: number }
	/** 5xx, another unexpected status, a network error or a timeout. */
	| { kind: 'unavailable'; reason: string };

/** Result of a request after the waits and retries in `send`. */
type Reply =
	| Exclude<Attempt, { kind: 'busy' | 'unavailable' }>
	| { kind: 'error'; reason: string };

type StopReply = Extract<Reply, { kind: 'expired' | 'cancelled' | 'error' }>;

function toOutcome(reply: StopReply): CheckOutcome {
	switch (reply.kind) {
		case 'expired':
			return { status: 'expired' };
		case 'cancelled':
			return CANCELLED;
		case 'error':
			return { status: 'error', reason: reply.reason };
	}
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return undefined;
	}
}

function toIdList(value: unknown): number[] {
	return Array.isArray(value) ? value.filter(isAppId) : [];
}

/** Checks the shape of a 200 reply. Null when it is not a bulk lookup reply. */
function parseResponse(value: unknown): BulkLookupResponse | null {
	if (!isRecord(value) || !Array.isArray(value.results)) return null;
	const results: ProtonSummary[] = [];
	for (const item of value.results) {
		// The other fields are checked when the results are saved.
		if (isRecord(item) && isAppId(item.id)) {
			results.push(item as ProtonSummary);
		}
	}
	const reply: BulkLookupResponse = {
		results,
		noReports: toIdList(value.noReports),
		failed: toIdList(value.failed),
		pending: toIdList(value.pending),
	};
	const pause = value.retryAfterMs;
	if (typeof pause === 'number' && Number.isFinite(pause) && pause > 0) {
		reply.retryAfterMs = pause;
	}
	return reply;
}

/** The wait a 429 asks for: Retry-After in seconds, 1 s by default. */
function busyWaitMs(response: Response): number {
	const header = response.headers.get('Retry-After');
	const seconds =
		header === null || header.trim() === '' ? Number.NaN : Number(header);
	if (!Number.isFinite(seconds)) return BUSY_WAIT_MS;
	return Math.min(Math.max(seconds * 1000, BUSY_WAIT_MS), MAX_WAIT_MS);
}

/** One POST with the timeout. Never throws. */
async function post(
	body: BulkLookupRequest,
	signal: AbortSignal,
): Promise<Attempt> {
	const deadline = withDeadline(signal, REQUEST_TIMEOUT_MS);
	try {
		const response = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
			signal: deadline.signal,
		});
		if (response.ok) {
			const data = parseResponse(parseJson(await response.text()));
			return data
				? { kind: 'ok', data }
				: { kind: 'unavailable', reason: 'invalid response' };
		}
		switch (response.status) {
			case 403:
				return { kind: 'expired' };
			case 429:
				return { kind: 'busy', waitMs: busyWaitMs(response) };
			case 400:
			case 413: {
				const reason = await response.text().catch(() => '');
				console.error(
					`The server rejected a batch of ${body.appIds.length} games with HTTP ${response.status}: ${reason}`,
				);
				return { kind: 'rejected' };
			}
			default:
				return { kind: 'unavailable', reason: `HTTP ${response.status}` };
		}
	} catch {
		if (signal.aborted) return { kind: 'cancelled' };
		return {
			kind: 'unavailable',
			reason: deadline.timedOut() ? 'timeout' : 'network error',
		};
	} finally {
		deadline.dispose();
	}
}

/**
 * Sends one request. After a 429 it waits for Retry-After and tries again,
 * up to 10 replies in a row. After a server error, network error or timeout
 * it tries again after 1, 2 and 4 seconds. Never throws.
 */
async function send(run: Run, body: BulkLookupRequest): Promise<Reply> {
	let busyReplies = 0;
	let errors = 0;
	for (;;) {
		const attempt = await post(body, run.signal);
		if (attempt.kind === 'busy') {
			busyReplies += 1;
			if (busyReplies >= MAX_BUSY_REPLIES) {
				return { kind: 'error', reason: 'server busy' };
			}
			if (!(await wait(run, attempt.waitMs, 'busy'))) {
				return { kind: 'cancelled' };
			}
		} else if (attempt.kind === 'unavailable') {
			if (errors >= ERROR_RETRY_DELAYS_MS.length) {
				return { kind: 'error', reason: attempt.reason };
			}
			const delay = ERROR_RETRY_DELAYS_MS[errors];
			errors += 1;
			if (!(await wait(run, delay, 'retrying'))) {
				return { kind: 'cancelled' };
			}
		} else {
			return attempt;
		}
	}
}

// Merging replies

function removeFromQueue(state: CheckState, ids: ReadonlySet<number>): void {
	if (ids.size > 0) state.queue = state.queue.filter((id) => !ids.has(id));
}

/**
 * Applies one reply to the state. Only ids from `batch` count. The sweep
 * only takes cache hits and leaves everything else queued for the lookups.
 * Pending ids keep their place in the queue. Returns how many ids got an
 * answer, failures included.
 */
function applyReply(
	state: CheckState,
	batch: readonly number[],
	reply: BulkLookupResponse,
	isLookup: boolean,
): number {
	const open = new Set(batch);
	const settled = new Set<number>();
	const take = (id: number): boolean => {
		if (!open.delete(id)) return false;
		settled.add(id);
		return true;
	};

	for (const summary of reply.results) {
		if (take(summary.id)) state.results.set(summary.id, summary);
	}
	for (const id of reply.noReports) {
		if (take(id)) state.noReports.add(id);
	}
	if (isLookup) {
		for (const id of reply.failed) {
			if (take(id)) state.failed.add(id);
		}
		for (const id of reply.pending) open.delete(id);
		// The server puts every id in exactly one list. Any it left out count
		// as failed, so the check cannot keep sending them forever.
		for (const id of open) {
			settled.add(id);
			state.failed.add(id);
		}
	}

	removeFromQueue(state, settled);
	return settled.size;
}

// Steps

/** Step 1: takes every cache hit, BULK_LIMITS.maxIds ids per request. */
async function sweepCache(run: Run): Promise<CheckOutcome | null> {
	run.phase = 'sweep';
	// The queue only holds ids without an answer, so a resumed sweep skips
	// everything an earlier run already settled.
	const ids = run.state.queue.slice();
	for (let start = 0; start < ids.length; start += BULK_LIMITS.maxIds) {
		const batch = ids.slice(start, start + BULK_LIMITS.maxIds);
		const reply = await send(run, { appIds: batch, cacheOnly: true });
		// A rejected sweep batch stays queued: the lookups send these ids
		// again in smaller batches, and mark them failed if those fail too.
		if (reply.kind === 'rejected') continue;
		if (reply.kind !== 'ok') return toOutcome(reply);
		if (run.signal.aborted) return CANCELLED;
		applyReply(run.state, batch, reply.data, false);
		report(run);
	}
	return null;
}

/**
 * Steps 2 and 3: sends the queue in batches of BULK_LIMITS.remoteBatch ids
 * until every id has an answer.
 */
async function lookUp(run: Run): Promise<CheckOutcome | null> {
	const { state } = run;
	let stalled = 0;
	while (state.queue.length > 0) {
		const batch = state.queue.slice(0, BULK_LIMITS.remoteBatch);
		const reply = await send(run, { appIds: batch });
		if (reply.kind === 'rejected') {
			// Mark the batch failed, so one bad batch cannot stop the check.
			for (const id of batch) state.failed.add(id);
			removeFromQueue(state, new Set(batch));
			stalled = 0;
			report(run);
			continue;
		}
		if (reply.kind !== 'ok') return toOutcome(reply);
		if (run.signal.aborted) return CANCELLED;

		const settled = applyReply(state, batch, reply.data, true);
		if (run.phase === 'fetch') {
			run.fetchReplies += 1;
			run.fetchSettled += settled;
		}
		stalled = settled > 0 ? 0 : stalled + 1;
		report(run);
		if (stalled >= MAX_STALLED_REPLIES) {
			return { status: 'error', reason: 'stalled' };
		}

		const pause = reply.data.retryAfterMs;
		if (pause !== undefined && state.queue.length > 0) {
			const waited = await wait(run, Math.min(pause, MAX_WAIT_MS), 'throttled');
			if (!waited) return CANCELLED;
		}
	}
	return null;
}

/**
 * Runs the check until every id has an answer, or until it stops. Resolves
 * with:
 * - `done`: every id has an answer. Read them from the state.
 * - `expired`: the captcha session ran out (403). The profile has to be
 *   loaded again on /start.
 * - `cancelled`: the signal aborted.
 * - `error`: the server stopped answering. The state keeps all progress;
 *   call runCheck again with it to go on.
 *
 * Reports progress right away, before the first request. Never rejects.
 * Only one run may use a state at a time.
 */
export async function runCheck(
	state: CheckState,
	{ signal, onProgress }: RunCheckOptions,
): Promise<CheckOutcome> {
	if (signal.aborted) return CANCELLED;
	const run: Run = {
		state,
		signal,
		onProgress,
		phase: phaseOf(state),
		waiting: null,
		fetchStartedAt: null,
		fetchReplies: 0,
		fetchSettled: 0,
	};
	report(run);

	try {
		if (!state.swept) {
			const stop = await sweepCache(run);
			if (stop) return stop;
			state.swept = true;
		}

		if (!state.retried) {
			run.phase = 'fetch';
			run.fetchStartedAt = performance.now();
			report(run);
			const stop = await lookUp(run);
			if (stop) return stop;

			if (state.failed.size > 0) {
				state.retryCount = state.failed.size;
				run.phase = 'retry';
				report(run);
				if (!(await sleep(RETRY_ROUND_DELAY_MS, signal))) return CANCELLED;
				state.queue = [...state.failed];
				state.failed.clear();
			}
			state.retried = true;
		}

		if (state.queue.length > 0) {
			run.phase = 'retry';
			report(run);
			const stop = await lookUp(run);
			if (stop) return stop;
		}

		report(run);
		return { status: 'done' };
	} catch (error) {
		// A bug must not leave the page waiting forever.
		if (signal.aborted) return CANCELLED;
		console.error('The library check failed:', error);
		return { status: 'error', reason: 'unexpected error' };
	}
}
