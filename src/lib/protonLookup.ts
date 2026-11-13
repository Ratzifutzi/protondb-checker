/**
 * Resolves ProtonDB summaries for many Steam apps at once. Answers from the
 * Mongo caches first and asks ProtonDB for the rest within a time budget.
 * Server only.
 */
import { logger } from '@/lib/logger';
import {
	fetchWithBudget,
	parseSummary,
	type BudgetResult,
	type SettledOutcome,
} from '@/lib/protondb';
import CachedProtonGame from '@/models/CachedProtonGame';
import MissingProtonGame from '@/models/MissingProtonGame';
import {
	BULK_LIMITS,
	type BulkLookupResponse,
	type ProtonSummary,
} from '@/types/proton';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Cached summaries younger than this are served without asking ProtonDB. */
const FRESH_MS = 30 * DAY_MS;
/** How long a "no reports" answer is trusted. Matches the TTL index. */
const MISSING_MS = 3 * DAY_MS;

export type ResolveOptions = {
	/** Only read the caches. Everything else comes back as pending. */
	cacheOnly?: boolean;
	/** No new ProtonDB call starts after this many milliseconds. */
	budgetMs: number;
	/** Stops the ProtonDB calls, for example when the client went away. */
	signal?: AbortSignal;
};

/** Where an id ends up. Ids without a placement are pending. */
type Placement =
	| { kind: 'result'; summary: ProtonSummary }
	| { kind: 'noReports' }
	| { kind: 'failed' };

type CachedRow = { appId?: unknown; savedAt?: unknown; data?: unknown };

type CacheHits = {
	fresh: Map<number, ProtonSummary>;
	/** Usable rows older than 30 days, served only when ProtonDB fails. */
	stale: Map<number, ProtonSummary>;
};

type Writes = { summaries: ProtonSummary[]; missing: number[] };

type Validator = { validate(row: unknown): Promise<unknown> };

function isFresh(savedAt: unknown, now: number): boolean {
	return savedAt instanceof Date && now - savedAt.getTime() < FRESH_MS;
}

async function loadCache(ids: number[], now: number): Promise<CacheHits> {
	const hits: CacheHits = { fresh: new Map(), stale: new Map() };
	if (ids.length === 0) return hits;

	const rows: CachedRow[] = await CachedProtonGame.find(
		{ appId: { $in: ids } },
		{ _id: 0, appId: 1, savedAt: 1, data: 1 },
	).lean();
	for (const row of rows) {
		if (typeof row.appId !== 'number') continue;
		// Malformed rows count as uncached and get fetched again.
		const summary = parseSummary(row.data, row.appId);
		if (!summary) continue;
		const bucket = isFresh(row.savedAt, now) ? hits.fresh : hits.stale;
		bucket.set(row.appId, summary);
	}
	return hits;
}

async function loadMissing(ids: number[], now: number): Promise<Set<number>> {
	if (ids.length === 0) return new Set();
	const rows = await MissingProtonGame.find(
		{ appId: { $in: ids }, savedAt: { $gte: new Date(now - MISSING_MS) } },
		{ _id: 0, appId: 1 },
	).lean();
	return new Set(rows.map((row) => row.appId));
}

/** Records each outcome and returns what should be written to the caches. */
function placeOutcomes(
	outcomes: SettledOutcome[],
	stale: ReadonlyMap<number, ProtonSummary>,
	placed: Map<number, Placement>,
): Writes {
	const writes: Writes = { summaries: [], missing: [] };
	for (const outcome of outcomes) {
		if (outcome.kind === 'ok') {
			placed.set(outcome.appId, { kind: 'result', summary: outcome.summary });
			writes.summaries.push(outcome.summary);
		} else if (outcome.kind === 'missing') {
			placed.set(outcome.appId, { kind: 'noReports' });
			writes.missing.push(outcome.appId);
		} else {
			const fallback = stale.get(outcome.appId);
			placed.set(
				outcome.appId,
				fallback ? { kind: 'result', summary: fallback } : { kind: 'failed' },
			);
		}
	}
	return writes;
}

function logRemoteProblems(remote: BudgetResult): void {
	const errors = remote.outcomes.filter((outcome) => outcome.kind === 'error');
	if (errors.length > 0) {
		const games = errors.length === 1 ? 'game' : 'games';
		const sample = errors
			.slice(0, 3)
			.map((outcome) => `${outcome.appId}: ${outcome.reason}`);
		logger.warn(`ProtonDB lookup failed for ${errors.length} ${games}`, {
			sample,
		});
	}
	if (remote.retryAfterMs !== undefined) {
		logger.warn(
			`ProtonDB asked to slow down, retry after ${remote.retryAfterMs} ms`,
		);
	}
}

/**
 * Bulk upserts skip Mongoose validators, so rows are checked against the
 * schema first. Invalid rows are logged and left out.
 */
async function keepValid<T extends { appId: number }>(
	model: Validator,
	rows: T[],
): Promise<T[]> {
	const checks = await Promise.allSettled(
		rows.map((row) => model.validate(row)),
	);
	return rows.filter((row, index) => {
		const check = checks[index];
		if (check.status === 'fulfilled') return true;
		logger.warn(`Not caching app ${row.appId}: ${String(check.reason)}`);
		return false;
	});
}

async function saveSummaries(
	summaries: ProtonSummary[],
	savedAt: Date,
): Promise<void> {
	const rows = await keepValid(
		CachedProtonGame,
		summaries.map((data) => ({ appId: data.id, savedAt, data })),
	);
	if (rows.length === 0) return;
	await CachedProtonGame.bulkWrite(
		rows.map(({ appId, data }) => ({
			updateOne: {
				filter: { appId },
				update: { $set: { data, savedAt } },
				upsert: true,
			},
		})),
		{ ordered: false, throwOnValidationError: true },
	);
}

async function saveMissing(appIds: number[], savedAt: Date): Promise<void> {
	const rows = await keepValid(
		MissingProtonGame,
		appIds.map((appId) => ({ appId, savedAt })),
	);
	if (rows.length === 0) return;
	await MissingProtonGame.bulkWrite(
		rows.map(({ appId }) => ({
			updateOne: {
				filter: { appId },
				update: { $set: { savedAt } },
				upsert: true,
			},
		})),
		{ ordered: false, throwOnValidationError: true },
	);
}

/** Drops cached summaries of games that have no reports any more. */
async function dropCached(appIds: number[]): Promise<void> {
	if (appIds.length === 0) return;
	await CachedProtonGame.deleteMany({ appId: { $in: appIds } });
}

/** Writes the cache updates. Failures are logged and never thrown. */
async function persist(writes: Writes): Promise<void> {
	const savedAt = new Date();
	const jobs: Array<[label: string, job: Promise<void>]> = [
		['cache summaries', saveSummaries(writes.summaries, savedAt)],
		['cache games without reports', saveMissing(writes.missing, savedAt)],
		['drop summaries of games without reports', dropCached(writes.missing)],
	];
	const settled = await Promise.allSettled(jobs.map(([, job]) => job));
	settled.forEach((result, index) => {
		if (result.status === 'rejected') {
			logger.error(`Could not ${jobs[index][0]}`, result.reason);
		}
	});
}

function collect(
	ids: readonly number[],
	placed: ReadonlyMap<number, Placement>,
	retryAfterMs?: number,
): BulkLookupResponse {
	const response: BulkLookupResponse = {
		results: [],
		noReports: [],
		failed: [],
		pending: [],
	};
	for (const id of ids) {
		const placement = placed.get(id);
		if (!placement) {
			response.pending.push(id);
		} else if (placement.kind === 'result') {
			response.results.push(placement.summary);
		} else {
			response[placement.kind].push(id);
		}
	}
	if (retryAfterMs !== undefined) response.retryAfterMs = retryAfterMs;
	return response;
}

/**
 * Looks up ProtonDB summaries for `requested`. Every id (after dedupe) lands
 * in exactly one of results, noReports, failed or pending:
 * 1. Fresh cached summaries go to results. Stale ones are kept as a fallback.
 * 2. Recent "no reports" answers go to noReports.
 * 3. With `cacheOnly`, everything else is pending.
 * 4. Otherwise up to BULK_LIMITS.remoteBatch of the rest are asked from
 *    ProtonDB within the budget. Failed calls use the stale copy when there
 *    is one. Ids that were not asked for stay pending.
 */
export async function resolveSummaries(
	requested: readonly number[],
	options: ResolveOptions,
): Promise<BulkLookupResponse> {
	const ids = [...new Set(requested)];
	const now = Date.now();
	const placed = new Map<number, Placement>();

	const { fresh, stale } = await loadCache(ids, now);
	for (const [id, summary] of fresh) {
		placed.set(id, { kind: 'result', summary });
	}

	const missing = await loadMissing(
		ids.filter((id) => !placed.has(id)),
		now,
	);
	for (const id of missing) placed.set(id, { kind: 'noReports' });

	if (options.cacheOnly) return collect(ids, placed);

	const batch = ids
		.filter((id) => !placed.has(id))
		.slice(0, BULK_LIMITS.remoteBatch);
	const remote = await fetchWithBudget(batch, {
		budgetMs: options.budgetMs,
		signal: options.signal,
	});
	// Calls cut short because the client left are not ProtonDB problems.
	if (!options.signal?.aborted) logRemoteProblems(remote);
	await persist(placeOutcomes(remote.outcomes, stale, placed));
	return collect(ids, placed, remote.retryAfterMs);
}
