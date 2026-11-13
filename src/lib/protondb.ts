/**
 * ProtonDB client: fetches report summaries and parses them into the shape
 * the app caches and returns. Server only.
 */
import type { ProtonSummary } from '@/types/proton';

const DEFAULT_API_BASE = 'https://www.protondb.com';
const USER_AGENT =
	'ProtonDB-Check (+https://github.com/Ratzifutzi/protondb-checker)';

/** ProtonDB calls running at the same time for one request. */
const DEFAULT_CONCURRENCY = 4;
/** How long a call may run past the budget deadline. */
const CALL_GRACE_MS = 3000;
const MIN_CALL_TIMEOUT_MS = 2000;
const MAX_CALL_TIMEOUT_MS = 8000;
const DEFAULT_RETRY_AFTER_MS = 10_000;
const MIN_RETRY_AFTER_MS = 2000;
const MAX_RETRY_AFTER_MS = 30_000;

export type FetchOutcome =
	| { kind: 'ok'; appId: number; summary: ProtonSummary }
	/** ProtonDB answered 404: no reports for this app. */
	| { kind: 'missing'; appId: number }
	/** ProtonDB answered 429 or 503 and wants us to wait. */
	| { kind: 'throttled'; appId: number; retryAfterMs: number }
	/** Any other status, a network error, a timeout or an unusable body. */
	| { kind: 'error'; appId: number; reason: string };

/** Outcomes that settle an id. Throttled ids go back to the queue instead. */
export type SettledOutcome = Exclude<FetchOutcome, { kind: 'throttled' }>;

export type FetchSummaryOptions = {
	timeoutMs: number;
	/** Aborts the call early, for example when the client went away. */
	signal?: AbortSignal;
};

export type BudgetOptions = {
	/** No new call starts after this many milliseconds. */
	budgetMs: number;
	/** Stops new calls and aborts running ones. */
	signal?: AbortSignal;
	/** Calls running at the same time. Defaults to 4. */
	concurrency?: number;
};

export type BudgetResult = {
	/** One entry per id that got an answer, in the order they finished. */
	outcomes: SettledOutcome[];
	/** Ids that were never asked for, including throttled ones put back. */
	notStarted: number[];
	/** Set when ProtonDB throttled us. The longest wait it asked for. */
	retryAfterMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
	return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function finiteOr(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Turns a ProtonDB summary (or a cached copy of one) into a ProtonSummary.
 * Returns null when there is no usable tier. String fields are lowercased,
 * a missing score or total becomes 0 and a missing trending tier falls back
 * to the tier. The id always comes from `appId`.
 */
export function parseSummary(
	raw: unknown,
	appId: number,
): ProtonSummary | null {
	if (!isRecord(raw)) return null;
	const tier = cleanText(raw.tier);
	if (!tier) return null;

	const summary: ProtonSummary = {
		id: appId,
		tier,
		trendingTier: cleanText(raw.trendingTier) || tier,
		confidence: cleanText(raw.confidence),
		score: finiteOr(raw.score, 0),
		total: finiteOr(raw.total, 0),
	};
	const bestReportedTier = cleanText(raw.bestReportedTier);
	if (bestReportedTier) summary.bestReportedTier = bestReportedTier;
	return summary;
}

function summaryUrl(appId: number): string {
	const base = process.env.PROTONDB_API_BASE || DEFAULT_API_BASE;
	return `${base.replace(/\/+$/, '')}/api/v1/reports/summaries/${appId}.json`;
}

function callSignal({ timeoutMs, signal }: FetchSummaryOptions): AbortSignal {
	const timeout = AbortSignal.timeout(timeoutMs);
	return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/** Reads Retry-After (seconds or an HTTP date) as milliseconds, clamped. */
function parseRetryAfter(header: string | null): number {
	const value = header?.trim() ?? '';
	if (!value) return DEFAULT_RETRY_AFTER_MS;
	const ms = /^\d+(\.\d+)?$/.test(value)
		? Number(value) * 1000
		: Date.parse(value) - Date.now();
	if (!Number.isFinite(ms)) return DEFAULT_RETRY_AFTER_MS;
	return clamp(ms, MIN_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS);
}

/** Frees the connection when the body is not needed. */
function discardBody(response: Response): void {
	response.body?.cancel().catch(() => undefined);
}

function describeError(error: unknown): string {
	if (error instanceof SyntaxError) return 'invalid JSON';
	if (typeof error !== 'object' || error === null) return String(error);
	const { name, message, cause } = error as {
		name?: unknown;
		message?: unknown;
		cause?: { code?: unknown; message?: unknown } | null;
	};
	if (name === 'TimeoutError') return 'timed out';
	if (name === 'AbortError' || name === 'ResponseAborted') return 'aborted';
	const text = typeof message === 'string' && message ? message : 'unknown';
	// fetch() only says "fetch failed". The cause has the useful part.
	const detail = cause?.code ?? cause?.message;
	return typeof detail === 'string' && detail ? `${text} (${detail})` : text;
}

async function readOutcome(
	appId: number,
	response: Response,
): Promise<FetchOutcome> {
	if (response.status === 404) {
		discardBody(response);
		return { kind: 'missing', appId };
	}
	if (response.status === 429 || response.status === 503) {
		discardBody(response);
		const retryAfterMs = parseRetryAfter(response.headers.get('retry-after'));
		return { kind: 'throttled', appId, retryAfterMs };
	}
	if (!response.ok) {
		discardBody(response);
		return { kind: 'error', appId, reason: `HTTP ${response.status}` };
	}
	const summary = parseSummary(await response.json(), appId);
	if (!summary) return { kind: 'error', appId, reason: 'no usable tier' };
	return { kind: 'ok', appId, summary };
}

/** Asks ProtonDB for one summary. Never throws. */
export async function fetchSummary(
	appId: number,
	options: FetchSummaryOptions,
): Promise<FetchOutcome> {
	try {
		const response = await fetch(summaryUrl(appId), {
			headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
			signal: callSignal(options),
			cache: 'no-store',
		});
		return await readOutcome(appId, response);
	} catch (error) {
		return { kind: 'error', appId, reason: describeError(error) };
	}
}

/**
 * Per call timeout: until 3 s after the deadline, but at least 2 s and at
 * most 8 s. A batch that starts its last call just before the deadline still
 * ends about 8 s after it started.
 */
function callTimeout(deadline: number): number {
	return clamp(
		deadline - Date.now() + CALL_GRACE_MS,
		MIN_CALL_TIMEOUT_MS,
		MAX_CALL_TIMEOUT_MS,
	);
}

/**
 * Looks up `ids` with a few workers that share one queue. Each worker makes
 * at least one call, but no new call starts once the budget is used up. When
 * ProtonDB throttles, the id goes back to the front of the queue and no
 * worker takes a new id. A request signal that is already aborted starts
 * nothing.
 */
export async function fetchWithBudget(
	ids: readonly number[],
	options: BudgetOptions,
): Promise<BudgetResult> {
	const { budgetMs, signal, concurrency = DEFAULT_CONCURRENCY } = options;
	const deadline = Date.now() + budgetMs;
	const queue = [...ids];
	const outcomes: SettledOutcome[] = [];
	const state: { stopped: boolean; retryAfterMs?: number } = {
		stopped: false,
	};

	const worker = async (): Promise<void> => {
		for (let calls = 0; ; calls++) {
			if (state.stopped || signal?.aborted) return;
			if (calls > 0 && Date.now() >= deadline) return;
			const appId = queue.shift();
			if (appId === undefined) return;

			const timeoutMs = callTimeout(deadline);
			const outcome = await fetchSummary(appId, { timeoutMs, signal });
			if (outcome.kind === 'throttled') {
				queue.unshift(appId);
				state.stopped = true;
				state.retryAfterMs = Math.max(
					state.retryAfterMs ?? 0,
					outcome.retryAfterMs,
				);
				return;
			}
			outcomes.push(outcome);
		}
	};

	const workerCount = Math.max(1, Math.min(concurrency, queue.length));
	await Promise.all(Array.from({ length: workerCount }, () => worker()));

	const result: BudgetResult = { outcomes, notStarted: queue };
	if (state.retryAfterMs !== undefined)
		result.retryAfterMs = state.retryAfterMs;
	return result;
}
