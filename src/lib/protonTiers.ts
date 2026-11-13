/**
 * Single source for ProtonDB tier data: order, ranks, labels, descriptions
 * and colors. Pure data and helpers, safe to import from server and client.
 */

/** Tiers ProtonDB itself reports, best first. */
export const PROTON_TIERS = [
	'platinum',
	'gold',
	'silver',
	'bronze',
	'borked',
	'pending',
] as const;

export type ProtonTier = (typeof PROTON_TIERS)[number];

/**
 * Every bucket a game can end up in. `none` means ProtonDB has no reports for
 * the game, `unchecked` means ProtonDB did not answer during the check.
 */
export type TierKey = ProtonTier | 'none' | 'unchecked';

/** Display order, best first. */
export const TIER_ORDER: readonly TierKey[] = [
	...PROTON_TIERS,
	'none',
	'unchecked',
];

/** Higher is better. Used to sort by rating. */
export const TIER_RANK: Record<TierKey, number> = {
	platinum: 7,
	gold: 6,
	silver: 5,
	bronze: 4,
	borked: 3,
	pending: 2,
	none: 1,
	unchecked: 0,
};

/** A light and a dark mode value, usable directly as a Chakra style prop. */
export type ColorPair = { base: string; _dark: string };

export type TierInfo = {
	key: TierKey;
	label: string;
	description: string;
	/** Fill color. Null for tiers drawn as an outline. */
	bg: ColorPair | null;
	/** Text color on top of `bg`. Null for tiers drawn as an outline. */
	fg: ColorPair | null;
	style: 'solid' | 'outline' | 'dashed';
};

const DARK_TEXT = '#111111';
const LIGHT_TEXT = '#FFFFFF';

export const TIERS: Record<TierKey, TierInfo> = {
	platinum: {
		key: 'platinum',
		label: 'Platinum',
		description: 'Runs perfectly out of the box',
		bg: { base: '#4F86C6', _dark: '#7FAEE6' },
		fg: { base: DARK_TEXT, _dark: DARK_TEXT },
		style: 'solid',
	},
	gold: {
		key: 'gold',
		label: 'Gold',
		description: 'Runs perfectly after some tweaks',
		bg: { base: '#C99A06', _dark: '#D9AE2B' },
		fg: { base: DARK_TEXT, _dark: DARK_TEXT },
		style: 'solid',
	},
	silver: {
		key: 'silver',
		label: 'Silver',
		description: 'Playable with minor issues',
		bg: { base: '#6E7580', _dark: '#BCC2CA' },
		fg: { base: LIGHT_TEXT, _dark: DARK_TEXT },
		style: 'solid',
	},
	bronze: {
		key: 'bronze',
		label: 'Bronze',
		description: 'Runs, but problems get in the way',
		bg: { base: '#D08E4C', _dark: '#D98B4A' },
		fg: { base: DARK_TEXT, _dark: DARK_TEXT },
		style: 'solid',
	},
	borked: {
		key: 'borked',
		label: 'Borked',
		description: 'Does not start or is not playable',
		bg: { base: '#A3202E', _dark: '#E0465A' },
		fg: { base: LIGHT_TEXT, _dark: DARK_TEXT },
		style: 'solid',
	},
	pending: {
		key: 'pending',
		label: 'Pending',
		description: 'Not enough reports for a rating yet',
		bg: { base: '#7C5CC4', _dark: '#9F85DE' },
		fg: { base: LIGHT_TEXT, _dark: DARK_TEXT },
		style: 'solid',
	},
	none: {
		key: 'none',
		label: 'No reports',
		description: 'Nobody has reported this game on ProtonDB yet',
		bg: null,
		fg: null,
		style: 'outline',
	},
	unchecked: {
		key: 'unchecked',
		label: 'Not checked',
		description: 'ProtonDB did not answer during the check',
		bg: null,
		fg: null,
		style: 'dashed',
	},
};

const PROTON_TIER_SET: ReadonlySet<string> = new Set(PROTON_TIERS);

/** True for the exact lowercase tier names ProtonDB uses. */
export function isProtonTier(value: unknown): value is ProtonTier {
	return typeof value === 'string' && PROTON_TIER_SET.has(value);
}

/** Lowercases the value. Anything that is not a known tier becomes `pending`. */
export function normalizeTier(value: unknown): ProtonTier {
	if (typeof value !== 'string') return 'pending';
	const lower = value.trim().toLowerCase();
	return isProtonTier(lower) ? lower : 'pending';
}

/** Platinum and Gold: the games that "run well". */
export function isGoldOrBetter(tier: TierKey): boolean {
	return tier === 'platinum' || tier === 'gold';
}

/** Tiers with a real rating: Platinum, Gold, Silver, Bronze and Borked. */
export function isMedalTier(tier: TierKey): boolean {
	return (
		tier === 'platinum' ||
		tier === 'gold' ||
		tier === 'silver' ||
		tier === 'bronze' ||
		tier === 'borked'
	);
}

/** Style props for a badge, chip or swatch, spread onto a Chakra element. */
export type TierStyleProps = {
	bg: ColorPair | string;
	color: ColorPair | string;
	borderColor: ColorPair | string;
	borderStyle: 'solid' | 'dashed';
	borderWidth: string;
};

/**
 * Solid tiers get their fill and text color. `none` gets a plain outline and
 * `unchecked` a dashed one, both with muted text, so the label always carries
 * the meaning and color is never the only signal.
 */
export function tierStyleProps(tier: TierKey): TierStyleProps {
	const info = TIERS[tier] ?? TIERS.pending;
	if (info.bg && info.fg) {
		return {
			bg: info.bg,
			color: info.fg,
			borderColor: info.bg,
			borderStyle: 'solid',
			borderWidth: '1px',
		};
	}
	return {
		bg: 'transparent',
		color: 'fg.muted',
		borderColor: 'border.emphasized',
		borderStyle: info.style === 'dashed' ? 'dashed' : 'solid',
		borderWidth: '1px',
	};
}

/**
 * One color per tier for accents such as a row border, a chip dot or a bar
 * segment. Tiers without a fill fall back to a neutral gray token.
 */
export function tierAccentColor(tier: TierKey): ColorPair | string {
	const info = TIERS[tier] ?? TIERS.pending;
	return info.bg ?? 'border.emphasized';
}
