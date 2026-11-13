/**
 * Client-side storage for a library check.
 *
 * Keys in localStorage:
 * - `checkInput`: the profile and games found on /start, waiting for /fetch.
 * - `games`, `profile`, `protonData`: the results of the last completed
 *   check. These keep the shapes older versions of the site wrote, so old
 *   saves still load.
 * - `checkMeta`: written last when a check completes. Ties the results to one
 *   profile and lists the games ProtonDB did not answer for.
 *
 * The results keys are only replaced when a check completes, so an abandoned
 * check can never mix one profile's games with another profile's ratings.
 *
 * Every read and write is guarded and no exported function throws. When
 * localStorage is missing or full, data is kept in memory for this tab.
 */

import { useSyncExternalStore } from 'react';

import { toSearchKey } from '@/lib/format';
import {
	isProtonTier,
	normalizeTier,
	type ProtonTier,
	type TierKey,
} from '@/lib/protonTiers';
import type {
	CheckInput,
	CheckMeta,
	ProtonSummary,
	StoredGame,
	StoredProfile,
} from '@/types/proton';

/** One game as the results page shows it. */
export type GameEntry = {
	appId: number;
	/** Never empty: "App <id>" when Steam gave no name. */
	name: string;
	/** `toSearchKey(name)`, computed once so search stays fast. */
	searchKey: string;
	/** Steam icon hash, not a URL. Build the URL with `steamIconUrl()`. */
	icon: string | null;
	/** Total playtime in minutes. 0 when never played or hidden. */
	minutes: number;
	/**
	 * Unix time in milliseconds (converted from Steam's seconds), so it can go
	 * straight into `formatDate()` or `new Date()`. 0 when never played.
	 */
	lastPlayed: number;
	tier: TierKey;
	/** ProtonDB score from 0 to 1. Only used to break ties. */
	score: number | null;
	/** Number of ProtonDB reports. */
	reports: number;
	/** Lowercase ProtonDB confidence, such as "strong" or "low". */
	confidence: string | null;
	/** Only set when ProtonDB sent a known tier. */
	trendingTier: ProtonTier | null;
};

export type StoredResults = {
	steamId: string;
	profile: StoredProfile;
	games: GameEntry[];
	/** ISO date of the check. Null for saves made before this was recorded. */
	checkedAt: string | null;
	/** True when at least one game has playtime. */
	hasPlaytime: boolean;
	/** Number of games with tier `unchecked`. */
	failedCount: number;
	/** True when the results only live in this tab because storage was full. */
	memoryOnly: boolean;
};

export type ResultsPreview = {
	steamId: string;
	nickname: string;
	/** Medium avatar URL. */
	avatar: string | null;
	gameCount: number;
	checkedAt: string | null;
};

export const STORAGE_KEYS = {
	games: 'games',
	profile: 'profile',
	protonData: 'protonData',
	checkMeta: 'checkMeta',
	checkInput: 'checkInput',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const RESULT_KEYS: readonly StorageKey[] = [
	'games',
	'profile',
	'protonData',
	'checkMeta',
];
const ALL_KEYS: readonly StorageKey[] = [...RESULT_KEYS, 'checkInput'];

const MAX_APP_ID = 2147483647;
const ICON_HASH = /^[0-9A-Za-z]{1,128}$/;
const DIGITS = /^\d+$/;
const JSON_ARRAY_START = /^\s*\[/;

// Raw access

/**
 * Fallback store, read before localStorage. Holds values that could not be
 * written to localStorage (quota exceeded, private mode, storage disabled).
 */
const memory = new Map<StorageKey, string>();

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

function getStorage(): Storage | null {
	if (!isBrowser()) return null;
	try {
		// Reading the property itself throws when site data is blocked.
		return window.localStorage ?? null;
	} catch {
		return null;
	}
}

type RawRead = { raw: string | null; fromMemory: boolean };

function readRaw(key: StorageKey): RawRead {
	const held = memory.get(key);
	if (held !== undefined) return { raw: held, fromMemory: true };
	const storage = getStorage();
	if (!storage) return { raw: null, fromMemory: false };
	try {
		return { raw: storage.getItem(key), fromMemory: false };
	} catch {
		return { raw: null, fromMemory: false };
	}
}

type JsonRead = { found: boolean; value: unknown; fromMemory: boolean };

function parseJson(raw: string): unknown {
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		return undefined;
	}
}

/** `found` is true when the key exists, even if its JSON is corrupt. */
function readJson(key: StorageKey): JsonRead {
	const { raw, fromMemory } = readRaw(key);
	if (raw === null) return { found: false, value: undefined, fromMemory };
	return { found: true, value: parseJson(raw), fromMemory };
}

function removeFromStorage(storage: Storage | null, key: StorageKey): void {
	if (!storage) return;
	try {
		storage.removeItem(key);
	} catch {
		// Nothing else to do: the value stays, and memory still wins on read.
	}
}

function writeToStorage(
	storage: Storage | null,
	key: StorageKey,
	value: string,
): boolean {
	if (!storage) return false;
	try {
		storage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

// Validation

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A Steam app id: an integer from 1 to 2^31-1, the range the API accepts. */
function toAppId(value: unknown): number | null {
	const n =
		typeof value === 'string' && DIGITS.test(value) ? Number(value) : value;
	return typeof n === 'number' &&
		Number.isInteger(n) &&
		n > 0 &&
		n <= MAX_APP_ID
		? n
		: null;
}

function toPositiveNumber(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? value
		: 0;
}

function toText(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Keeps http and https links only, so stored data cannot add a script URL. */
function toHttpUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || value === '') return undefined;
	try {
		const { protocol } = new URL(value);
		return protocol === 'https:' || protocol === 'http:' ? value : undefined;
	} catch {
		return undefined;
	}
}

function toValidDate(value: string): string | null {
	return value !== '' && !Number.isNaN(Date.parse(value)) ? value : null;
}

function uniqueAppIds(list: unknown): number[] {
	if (!Array.isArray(list)) return [];
	const ids = new Set<number>();
	for (const item of list) {
		const id = toAppId(item);
		if (id !== null) ids.add(id);
	}
	return [...ids];
}

/**
 * Keeps the profile fields the app uses and drops the rest of the Steam
 * object. Returns null when there is no SteamID. A missing nickname falls
 * back to the SteamID and a missing profile link to the standard one.
 */
export function trimProfile(raw: unknown): StoredProfile | null {
	try {
		if (!isRecord(raw)) return null;
		const steamID = toText(raw.steamID);
		if (!steamID) return null;

		const avatarRaw = isRecord(raw.avatar) ? raw.avatar : {};
		const avatar: StoredProfile['avatar'] = {};
		const medium = toHttpUrl(avatarRaw.medium);
		const large = toHttpUrl(avatarRaw.large);
		if (medium) avatar.medium = medium;
		if (large) avatar.large = large;

		const fallbackUrl = DIGITS.test(steamID)
			? `https://steamcommunity.com/profiles/${steamID}`
			: '';
		const profile: StoredProfile = {
			steamID,
			nickname: toText(raw.nickname) || steamID,
			url: toHttpUrl(raw.url) ?? fallbackUrl,
			avatar,
		};
		if (
			typeof raw.personaState === 'number' &&
			Number.isFinite(raw.personaState)
		) {
			profile.personaState = raw.personaState;
		}
		if (typeof raw.visible === 'boolean') profile.visible = raw.visible;
		return profile;
	} catch {
		return null;
	}
}

/**
 * Keeps the game fields the app uses and drops the rest of the Steam object.
 * Entries without a valid app id are dropped and duplicate ids are removed
 * (the first one wins).
 */
export function trimGames(raw: unknown): StoredGame[] {
	try {
		if (!Array.isArray(raw)) return [];
		const seen = new Set<number>();
		const games: StoredGame[] = [];
		for (const item of raw) {
			if (!isRecord(item) || !isRecord(item.game)) continue;
			const id = toAppId(item.game.id);
			if (id === null || seen.has(id)) continue;
			seen.add(id);

			const game: StoredGame['game'] = { id, name: toText(item.game.name) };
			if (
				typeof item.game.icon === 'string' &&
				ICON_HASH.test(item.game.icon)
			) {
				game.icon = item.game.icon;
			}
			const entry: StoredGame = {
				game,
				minutes: toPositiveNumber(item.minutes),
			};
			const lastPlayed = toPositiveNumber(item.lastPlayedTimestamp);
			if (lastPlayed > 0) entry.lastPlayedTimestamp = lastPlayed;
			games.push(entry);
		}
		return games;
	} catch {
		return [];
	}
}

/**
 * A summary as written to `protonData`. `score` is left out when it is not a
 * number, so it reads back as unknown instead of as a score of 0.
 */
type StoredSummary = Omit<ProtonSummary, 'score'> & { score?: number };

/** Keeps the summary fields the app uses, one per game in the library. */
function trimSummaries(
	list: unknown,
	gameIds: ReadonlySet<number>,
): StoredSummary[] {
	if (!Array.isArray(list)) return [];
	const seen = new Set<number>();
	const summaries: StoredSummary[] = [];
	for (const item of list) {
		if (!isRecord(item)) continue;
		const id = toAppId(item.id);
		if (id === null || seen.has(id) || !gameIds.has(id)) continue;
		seen.add(id);
		const summary: StoredSummary = {
			id,
			tier: typeof item.tier === 'string' ? item.tier : 'pending',
			trendingTier:
				typeof item.trendingTier === 'string' ? item.trendingTier : '',
			confidence: typeof item.confidence === 'string' ? item.confidence : '',
			total: toPositiveNumber(item.total),
		};
		if (typeof item.score === 'number' && Number.isFinite(item.score)) {
			summary.score = item.score;
		}
		if (typeof item.bestReportedTier === 'string') {
			summary.bestReportedTier = item.bestReportedTier;
		}
		summaries.push(summary);
	}
	return summaries;
}

/** Null when the value has no SteamID, which then counts as no meta at all. */
function parseMeta(value: unknown): CheckMeta | null {
	if (!isRecord(value)) return null;
	const steamId = toText(value.steamId);
	if (!steamId) return null;
	return {
		v: 1,
		steamId,
		checkedAt: toText(value.checkedAt),
		gameCount: Math.floor(toPositiveNumber(value.gameCount)),
		failed: uniqueAppIds(value.failed),
	};
}

function readMeta(): CheckMeta | null {
	const meta = readJson('checkMeta');
	return meta.found ? parseMeta(meta.value) : null;
}

// Change tracking

// Bumped on every change that can affect the matching snapshot. The input
// snapshot also depends on the results keys (legacy fallback), so every
// results change bumps both.
let resultsVersion = 0;
let inputVersion = 0;
const listeners = new Set<() => void>();

function emitChange(resultsChanged: boolean): void {
	if (resultsChanged) resultsVersion += 1;
	inputVersion += 1;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function handleStorageEvent(event: StorageEvent): void {
	// Ignore sessionStorage changes.
	if (event.storageArea && event.storageArea !== getStorage()) return;
	const key = event.key;
	if (key === null) {
		// Another tab cleared localStorage.
		memory.clear();
		emitChange(true);
	} else if ((RESULT_KEYS as readonly string[]).includes(key)) {
		// Another tab wrote newer results, which replace any copy held here.
		for (const resultKey of RESULT_KEYS) memory.delete(resultKey);
		emitChange(true);
	} else if (key === STORAGE_KEYS.checkInput) {
		memory.delete(key);
		emitChange(false);
	}
}

function handlePageShow(event: PageTransitionEvent): void {
	// A page restored from the back/forward cache may have missed changes.
	if (event.persisted) emitChange(true);
}

// Listen for the whole life of the page, not only while a hook is mounted,
// so a cached snapshot never outlives a change made in another tab.
if (isBrowser()) {
	window.addEventListener('storage', handleStorageEvent);
	window.addEventListener('pageshow', handlePageShow);
}

/** Recomputes only when the version changes, so the reference stays stable. */
function cachedSnapshot<T>(getVersion: () => number, load: () => T): () => T {
	let cache: { version: number; value: T } | null = null;
	return () => {
		const version = getVersion();
		if (cache === null || cache.version !== version) {
			cache = { version, value: load() };
		}
		return cache.value;
	};
}

// Check input (between /start and /fetch)

/**
 * Stages the profile and games returned by /api/check for /fetch. Leaves the
 * results of the previous check untouched. `ok` is false when the profile is
 * invalid (nothing is saved then); `persisted` is false when the data only
 * lives in memory for this tab.
 */
export function saveCheckInput(raw: { profile: unknown; games: unknown }): {
	ok: boolean;
	persisted: boolean;
} {
	if (!isBrowser()) return { ok: false, persisted: false };
	try {
		const profile = trimProfile(raw?.profile);
		if (!profile) return { ok: false, persisted: false };
		const input: CheckInput = { v: 1, profile, games: trimGames(raw.games) };
		const value = JSON.stringify(input);

		// Remove the old copy first: it frees space, and a failed write must
		// not leave another profile's input behind for the next page load.
		const storage = getStorage();
		memory.delete('checkInput');
		removeFromStorage(storage, 'checkInput');
		const persisted = writeToStorage(storage, 'checkInput', value);
		if (!persisted) memory.set('checkInput', value);

		emitChange(false);
		return { ok: true, persisted };
	} catch {
		return { ok: false, persisted: false };
	}
}

function readCheckInput(): CheckInput | null {
	const staged = readJson('checkInput');
	if (staged.found) {
		if (!isRecord(staged.value)) return null;
		const profile = trimProfile(staged.value.profile);
		return profile
			? { v: 1, profile, games: trimGames(staged.value.games) }
			: null;
	}

	// Before `checkInput` existed, /start wrote `games` and `profile` and
	// /fetch wrote `protonData` only at the end. So the two keys without
	// `protonData` are a check that was cut off by the deploy, not old results.
	if (readRaw('protonData').raw !== null) return null;
	const games = readJson('games');
	if (!Array.isArray(games.value)) return null;
	const profile = trimProfile(readJson('profile').value);
	return profile ? { v: 1, profile, games: trimGames(games.value) } : null;
}

/** The staged input for /fetch, or null when there is nothing to check. */
export function loadCheckInput(): CheckInput | null {
	try {
		return readCheckInput();
	} catch {
		return null;
	}
}

// Results

/**
 * Replaces the stored results with a completed check. Removes all five keys
 * first (the staged input included), then writes `games`, `profile` and
 * `protonData`, and `checkMeta` last. If any write fails, nothing stays in
 * localStorage and all four are kept in memory for this tab instead.
 */
export function saveResults(args: {
	profile: StoredProfile;
	games: StoredGame[];
	summaries: ProtonSummary[];
	failed: number[];
	checkedAt: string;
}): { persisted: boolean } {
	if (!isBrowser()) return { persisted: false };
	let persisted = false;
	try {
		const profile = trimProfile(args.profile);
		if (!profile) return { persisted: false };
		const games = trimGames(args.games);
		const gameIds = new Set(games.map((entry) => entry.game.id));
		const summaries = trimSummaries(args.summaries, gameIds);
		const answered = new Set(summaries.map((summary) => summary.id));
		const meta: CheckMeta = {
			v: 1,
			steamId: profile.steamID,
			checkedAt: typeof args.checkedAt === 'string' ? args.checkedAt : '',
			gameCount: games.length,
			failed: uniqueAppIds(args.failed).filter(
				(id) => gameIds.has(id) && !answered.has(id),
			),
		};
		const writes: [StorageKey, string][] = [
			['games', JSON.stringify(games)],
			['profile', JSON.stringify(profile)],
			['protonData', JSON.stringify(summaries)],
			['checkMeta', JSON.stringify(meta)],
		];

		const storage = getStorage();
		for (const key of ALL_KEYS) {
			memory.delete(key);
			removeFromStorage(storage, key);
		}
		persisted = storage !== null;
		for (const [key, value] of writes) {
			if (!persisted) break;
			persisted = writeToStorage(storage, key, value);
		}
		if (!persisted) {
			// Drop a partial write so a reload never finds half a result set.
			for (const [key] of writes) removeFromStorage(storage, key);
			for (const [key, value] of writes) memory.set(key, value);
		}
	} catch {
		persisted = false;
	}
	emitChange(true);
	return { persisted };
}

function toEntry(
	stored: StoredGame,
	summary: Record<string, unknown> | undefined,
	failed: ReadonlySet<number>,
): GameEntry {
	const { id } = stored.game;
	const name = stored.game.name || `App ${id}`;
	const base = {
		appId: id,
		name,
		searchKey: toSearchKey(name),
		icon: stored.game.icon ?? null,
		minutes: stored.minutes,
		lastPlayed: (stored.lastPlayedTimestamp ?? 0) * 1000,
	};
	if (!summary) {
		return {
			...base,
			tier: failed.has(id) ? 'unchecked' : 'none',
			score: null,
			reports: 0,
			confidence: null,
			trendingTier: null,
		};
	}
	const trending = toText(summary.trendingTier).toLowerCase();
	const confidence = toText(summary.confidence).toLowerCase();
	return {
		...base,
		tier: normalizeTier(summary.tier),
		score:
			typeof summary.score === 'number' && Number.isFinite(summary.score)
				? summary.score
				: null,
		reports: toPositiveNumber(summary.total),
		confidence: confidence || null,
		trendingTier: isProtonTier(trending) ? trending : null,
	};
}

function readResults(): StoredResults | null {
	const games = readJson('games');
	if (!Array.isArray(games.value)) return null;
	const profileRead = readJson('profile');
	const profile = trimProfile(profileRead.value);
	if (!profile) return null;
	const proton = readJson('protonData');
	if (!Array.isArray(proton.value)) return null;
	const meta = readMeta();
	if (meta && meta.steamId !== profile.steamID) return null;

	const summaries = new Map<number, Record<string, unknown>>();
	for (const item of proton.value) {
		if (!isRecord(item)) continue;
		const id = toAppId(item.id);
		if (id !== null && !summaries.has(id)) summaries.set(id, item);
	}
	const failed = new Set(meta?.failed ?? []);

	const entries: GameEntry[] = [];
	let hasPlaytime = false;
	let failedCount = 0;
	for (const stored of trimGames(games.value)) {
		const entry = toEntry(stored, summaries.get(stored.game.id), failed);
		if (entry.minutes > 0) hasPlaytime = true;
		if (entry.tier === 'unchecked') failedCount += 1;
		entries.push(entry);
	}

	return {
		steamId: profile.steamID,
		profile,
		games: entries,
		checkedAt: meta ? toValidDate(meta.checkedAt) : null,
		hasPlaytime,
		failedCount,
		memoryOnly: games.fromMemory || profileRead.fromMemory || proton.fromMemory,
	};
}

/**
 * The results of the last completed check, or null when nothing usable is
 * stored (missing, corrupt, or `checkMeta` belongs to another profile).
 * Accepts saves from older versions of the site.
 */
export function loadResults(): StoredResults | null {
	try {
		return readResults();
	} catch {
		return null;
	}
}

function readPreview(): ResultsPreview | null {
	// Only check that the big keys look like arrays; parsing them is the
	// expensive part and the home page does not need their content.
	const proton = readRaw('protonData').raw;
	if (proton === null || !JSON_ARRAY_START.test(proton)) return null;
	const gamesRaw = readRaw('games').raw;
	if (gamesRaw === null || !JSON_ARRAY_START.test(gamesRaw)) return null;
	const profile = trimProfile(readJson('profile').value);
	if (!profile) return null;
	const meta = readMeta();
	if (meta && meta.steamId !== profile.steamID) return null;

	let gameCount: number;
	if (meta) {
		gameCount = meta.gameCount;
	} else {
		// Saves from before `checkMeta` existed: count the games themselves.
		const parsed = parseJson(gamesRaw);
		if (!Array.isArray(parsed)) return null;
		gameCount = trimGames(parsed).length;
	}

	return {
		steamId: profile.steamID,
		nickname: profile.nickname,
		avatar: profile.avatar.medium ?? profile.avatar.large ?? null,
		gameCount,
		checkedAt: meta ? toValidDate(meta.checkedAt) : null,
	};
}

/** A cheap summary of the stored results for the home page. */
export function loadResultsPreview(): ResultsPreview | null {
	try {
		return readPreview();
	} catch {
		return null;
	}
}

// Hooks

const getResultsSnapshot = cachedSnapshot(() => resultsVersion, loadResults);
const getPreviewSnapshot = cachedSnapshot(
	() => resultsVersion,
	loadResultsPreview,
);
const getInputSnapshot = cachedSnapshot(() => inputVersion, loadCheckInput);

// The server has no storage. Returning undefined makes the server render and
// the hydration pass show a loading state, then the client fills in the data.
function getServerSnapshot(): undefined {
	return undefined;
}

/**
 * The stored results. `undefined` while not loaded yet (server render and
 * hydration), `null` when nothing usable is stored.
 */
export function useStoredResults(): StoredResults | null | undefined {
	return useSyncExternalStore<StoredResults | null | undefined>(
		subscribe,
		getResultsSnapshot,
		getServerSnapshot,
	);
}

/**
 * The staged input for /fetch. `undefined` while not loaded yet, `null` when
 * there is nothing to check. Note that `saveResults()` removes the input, so
 * this turns null right after a check is saved.
 */
export function useStoredCheckInput(): CheckInput | null | undefined {
	return useSyncExternalStore<CheckInput | null | undefined>(
		subscribe,
		getInputSnapshot,
		getServerSnapshot,
	);
}

/**
 * A cheap preview of the stored results for the home page. `undefined` while
 * not loaded yet, `null` when there are no results.
 */
export function useResultsPreview(): ResultsPreview | null | undefined {
	return useSyncExternalStore<ResultsPreview | null | undefined>(
		subscribe,
		getPreviewSnapshot,
		getServerSnapshot,
	);
}

// Steam image helpers

/** URL of the small square app icon, or null when there is no icon hash. */
export function steamIconUrl(
	appId: number,
	icon: string | null,
): string | null {
	if (!icon || !ICON_HASH.test(icon) || toAppId(appId) === null) return null;
	return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appId}/${icon}.jpg`;
}
