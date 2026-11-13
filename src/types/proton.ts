/**
 * Shared types for the ProtonDB lookup API and for what the client keeps in
 * localStorage. This module is imported by server and client code, so it must
 * stay free of browser and Node specific code.
 */

/** One ProtonDB summary for a Steam app, as cached and returned by /api/fetch. */
export type ProtonSummary = {
	id: number;
	tier: string;
	trendingTier: string;
	bestReportedTier?: string;
	confidence: string;
	score: number;
	total: number;
};

/** Body of POST /api/fetch. */
export type BulkLookupRequest = {
	appIds: number[];
	/** Only answer from the cache and never call ProtonDB. */
	cacheOnly?: boolean;
};

/** Response of POST /api/fetch. Every requested id lands in exactly one list. */
export type BulkLookupResponse = {
	results: ProtonSummary[];
	/** ProtonDB has no reports for these ids. */
	noReports: number[];
	/** ProtonDB did not answer for these ids and there was no cached copy. */
	failed: number[];
	/** Not looked up yet. Send them again in a later request. */
	pending: number[];
	/** Set when ProtonDB asked us to slow down. Wait this long before the next request. */
	retryAfterMs?: number;
};

export const BULK_LIMITS = {
	/** Most ids accepted in one request. */
	maxIds: 1000,
	/** Largest accepted request body. Bigger bodies get a 413. */
	maxBodyBytes: 32768,
	/** Batch size the client uses for requests that may call ProtonDB. */
	remoteBatch: 200,
} as const;

/** A game from the Steam library, trimmed to what the app needs. */
export type StoredGame = {
	game: { id: number; name: string; icon?: string };
	/** Total playtime in minutes. */
	minutes: number;
	/** Unix time in seconds, as Steam reports it. Missing when never played. */
	lastPlayedTimestamp?: number;
};

/** A Steam profile, trimmed to what the app needs. */
export type StoredProfile = {
	steamID: string;
	nickname: string;
	url: string;
	avatar: { medium?: string; large?: string };
	personaState?: number;
	visible?: boolean;
};

/** Written last when a check completes. Ties the stored results together. */
export type CheckMeta = {
	v: 1;
	steamId: string;
	/** ISO 8601 date of the check. */
	checkedAt: string;
	gameCount: number;
	/** App ids ProtonDB did not answer for, shown as "Not checked". */
	failed: number[];
};

/** Staging area between /start and /fetch. */
export type CheckInput = { v: 1; profile: StoredProfile; games: StoredGame[] };
