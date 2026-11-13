/**
 * Number, date and text formatting for the UI. Uses the browser's default
 * locale, so call these on the client only (not during server rendering),
 * otherwise the server and the browser may format differently.
 */

let countFormat: Intl.NumberFormat | null = null;
let percentFormat: Intl.NumberFormat | null = null;
let decimalFormat: Intl.NumberFormat | null = null;
let dateFormat: Intl.DateTimeFormat | null = null;

// Formatters are created on first use and reused, since building one is far
// slower than calling it and lists call these thousands of times.
function counts(): Intl.NumberFormat {
	countFormat ??= new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 0,
	});
	return countFormat;
}

function percents(): Intl.NumberFormat {
	percentFormat ??= new Intl.NumberFormat(undefined, {
		style: 'percent',
		maximumFractionDigits: 0,
	});
	return percentFormat;
}

function oneDecimal(): Intl.NumberFormat {
	decimalFormat ??= new Intl.NumberFormat(undefined, {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	});
	return decimalFormat;
}

function dates(): Intl.DateTimeFormat {
	dateFormat ??= new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
	return dateFormat;
}

/** A whole number with grouping, for example "1,234". */
export function formatCount(n: number): string {
	return counts().format(Number.isFinite(n) ? n : 0);
}

/**
 * A share as a whole percent, for example 0.82 gives "82%". Small shares
 * above 0 read "less than 1%", and shares just under 1 read "more than 99%"
 * instead of rounding up to a misleading "100%".
 */
export function formatPercent(fraction: number): string {
	if (!Number.isFinite(fraction) || fraction <= 0) return percents().format(0);
	if (fraction < 0.005) return `less than ${percents().format(0.01)}`;
	if (fraction >= 0.995 && fraction < 1) {
		return `more than ${percents().format(0.99)}`;
	}
	return percents().format(fraction);
}

/** A medium date such as "Nov 13, 2026". Empty string for invalid input. */
export function formatDate(value: string | number | Date): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return dates().format(date);
}

/**
 * Playtime from Steam minutes: "Never played", "Less than 1 min" (played,
 * but under a minute), "35 min", "2.5 h" below 10 hours, then whole hours
 * such as "1,142 h".
 *
 * `lastPlayed` only matters when `minutes` is 0: any value above 0 means the
 * game was started at some point. The unit does not matter.
 */
export function formatPlaytime(minutes: number, lastPlayed?: number): string {
	const total = Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
	if (total === 0) {
		return lastPlayed !== undefined && lastPlayed > 0
			? 'Less than 1 min'
			: 'Never played';
	}
	if (total < 60) return `${formatCount(Math.max(1, Math.round(total)))} min`;
	const tenths = Math.round(total / 6) / 10;
	if (tenths < 10) return `${oneDecimal().format(tenths)} h`;
	return `${formatCount(Math.round(total / 60))} h`;
}

/** A count with the matching noun, for example "1 game" or "1,234 games". */
export function pluralize(n: number, one: string, other: string): string {
	return `${formatCount(n)} ${n === 1 ? one : other}`;
}

// Trademark, registered and copyright signs.
const LEGAL_SIGNS = /[\u2122\u00AE\u00A9]/g;
const COMBINING_MARKS = /\p{M}/gu;
const WHITESPACE = /\s+/g;

/**
 * A normalized form of a game name for search: no trademark, registered or
 * copyright signs, no accents, lowercase, single spaces. "Pokémon™ Legends"
 * becomes "pokemon legends". Normalize the query the same way.
 */
export function toSearchKey(text: string): string {
	if (typeof text !== 'string' || text === '') return '';
	return text
		.replace(LEGAL_SIGNS, '')
		.normalize('NFKD')
		.replace(COMBINING_MARKS, '')
		.toLowerCase()
		.replace(WHITESPACE, ' ')
		.trim();
}
