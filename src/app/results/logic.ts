/**
 * Pure helpers for the results page: the library summary, the sort orders
 * and the filter. No React and no browser code here.
 */

import { toSearchKey } from '@/lib/format';
import { isGoldOrBetter, TIER_RANK, type TierKey } from '@/lib/protonTiers';
import type { GameEntry } from '@/lib/storage';

export type SortKey = 'playtime' | 'rating' | 'recent' | 'name';

/** The options of the "Sort by" select, in the order they are listed. */
export const SORT_OPTIONS: readonly { value: SortKey; label: string }[] = [
	{ value: 'playtime', label: 'Most played' },
	{ value: 'rating', label: 'Best rating' },
	{ value: 'recent', label: 'Recently played' },
	{ value: 'name', label: 'Name (A-Z)' },
];

export function isSortKey(value: unknown): value is SortKey {
	return SORT_OPTIONS.some((option) => option.value === value);
}

/** Most played when Steam shared playtime, otherwise best rating. */
export function defaultSortKey(hasPlaytime: boolean): SortKey {
	return hasPlaytime ? 'playtime' : 'rating';
}

export type ResultsSummary = {
	/** Number of games in the library. */
	total: number;
	/** Number of games per tier. Every tier is present, 0 when empty. */
	counts: Record<TierKey, number>;
	/** Games rated Gold or Platinum. */
	runsWell: number;
	/** Playtime of the whole library in minutes. */
	totalMinutes: number;
	/** Playtime of the games that run well, in minutes. */
	goodMinutes: number;
	/** `goodMinutes / totalMinutes`, or null when there is no playtime. */
	playtimeShare: number | null;
};

function emptyCounts(): Record<TierKey, number> {
	return {
		platinum: 0,
		gold: 0,
		silver: 0,
		bronze: 0,
		borked: 0,
		pending: 0,
		none: 0,
		unchecked: 0,
	};
}

export function summarize(games: readonly GameEntry[]): ResultsSummary {
	const counts = emptyCounts();
	let runsWell = 0;
	let totalMinutes = 0;
	let goodMinutes = 0;
	for (const game of games) {
		counts[game.tier] += 1;
		totalMinutes += game.minutes;
		if (isGoldOrBetter(game.tier)) {
			runsWell += 1;
			goodMinutes += game.minutes;
		}
	}
	return {
		total: games.length,
		counts,
		runsWell,
		totalMinutes,
		goodMinutes,
		playtimeShare: totalMinutes > 0 ? goodMinutes / totalMinutes : null,
	};
}

type Comparator = (a: GameEntry, b: GameEntry) => number;

let collator: Intl.Collator | null = null;

// Created on first use, so the server never builds one it does not need.
// `numeric` sorts "Game 2" before "Game 10"; `base` ignores case and accents.
function names(): Intl.Collator {
	collator ??= new Intl.Collator(undefined, {
		sensitivity: 'base',
		numeric: true,
	});
	return collator;
}

/** Name A to Z. Equal names fall back to the app id, so the order is fixed. */
const byName: Comparator = (a, b) =>
	names().compare(a.name, b.name) || a.appId - b.appId;

const byMinutes: Comparator = (a, b) => b.minutes - a.minutes;

/** Higher score first. Games without a score come after the ones with one. */
const byScore: Comparator = (a, b) => {
	if (a.score === b.score) return 0;
	if (a.score === null) return 1;
	if (b.score === null) return -1;
	return b.score - a.score;
};

export const COMPARATORS: Record<SortKey, Comparator> = {
	playtime: (a, b) => byMinutes(a, b) || byName(a, b),
	rating: (a, b) =>
		TIER_RANK[b.tier] - TIER_RANK[a.tier] ||
		byScore(a, b) ||
		byMinutes(a, b) ||
		byName(a, b),
	recent: (a, b) =>
		b.lastPlayed - a.lastPlayed || byMinutes(a, b) || byName(a, b),
	name: byName,
};

/**
 * Keeps the games in one of the selected tiers (all tiers when none are
 * selected) whose name contains the query. The query is normalized the same
 * way as `GameEntry.searchKey`, so accents, case and trademark signs do not
 * matter. Returns the input list itself when nothing is filtered.
 */
export function filterGames(
	games: readonly GameEntry[],
	tiers: ReadonlySet<TierKey>,
	query: string,
): readonly GameEntry[] {
	const needle = toSearchKey(query);
	if (tiers.size === 0 && needle === '') return games;
	return games.filter(
		(game) =>
			(tiers.size === 0 || tiers.has(game.tier)) &&
			game.searchKey.includes(needle),
	);
}
