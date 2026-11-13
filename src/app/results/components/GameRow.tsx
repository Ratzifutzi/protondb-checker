'use client';

import {
	Box,
	chakra,
	Flex,
	Link,
	LinkBox,
	LinkOverlay,
	Text,
	VisuallyHidden,
} from '@chakra-ui/react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { FaSteam } from 'react-icons/fa';

import { formatDate, formatPlaytime, pluralize } from '@/lib/format';
import {
	isMedalTier,
	type ProtonTier,
	TIER_RANK,
	TIERS,
	tierAccentColor,
} from '@/lib/protonTiers';
import type { GameEntry } from '@/lib/storage';

import GameThumb from './GameThumb';
import TierBadge from './TierBadge';

/** ProtonDB confidence levels worth showing next to the report count. */
const CONFIDENCE_LEVELS: ReadonlySet<string> = new Set([
	'strong',
	'good',
	'moderate',
	'weak',
	'inadequate',
]);

/** "312 reports · strong confidence", or null when there are no reports. */
function reportsText(game: GameEntry): string | null {
	if (game.reports <= 0) return null;
	const reports = pluralize(game.reports, 'report', 'reports');
	return game.confidence && CONFIDENCE_LEVELS.has(game.confidence)
		? `${reports} · ${game.confidence} confidence`
		: reports;
}

/** The trending tier, when it differs from the rating and both are medals. */
function trendingTier(game: GameEntry): ProtonTier | null {
	const { tier, trendingTier: trending } = game;
	if (!trending || trending === tier) return null;
	return isMedalTier(tier) && isMedalTier(trending) ? trending : null;
}

/**
 * "142 h · last played Mar 3, 2025". The playtime part is left out when the
 * profile shares no playtime, the date part when the game was never played.
 */
function playtimeText(game: GameEntry, hasPlaytime: boolean): ReactNode {
	const playtime = hasPlaytime
		? formatPlaytime(game.minutes, game.lastPlayed)
		: '';
	const date = game.lastPlayed > 0 ? formatDate(game.lastPlayed) : '';
	if (!date) return playtime || null;
	return (
		<>
			{playtime ? `${playtime} · last played ` : 'Last played '}
			{/* Keeps the date on one line when the text wraps. */}
			<chakra.span whiteSpace="nowrap">{date}</chakra.span>
		</>
	);
}

// The ProtonDB link covers the whole row, so the row shows its focus ring.
const rowCss = {
	'&:has(.chakra-linkbox__overlay:focus-visible)': {
		outlineWidth: '2px',
		outlineStyle: 'solid',
		outlineColor: 'colorPalette.focusRing',
		outlineOffset: '2px',
	},
};

// Where :has() works, the ring on the row replaces the one on the link text.
const overlayCss = {
	'@supports selector(:has(*))': {
		'&:focus-visible': { outline: 'none' },
	},
};

type GameRowProps = {
	game: GameEntry;
	/** False when Steam shared no playtime for the profile. */
	hasPlaytime: boolean;
};

/**
 * One game in the list. The whole row links to the game on ProtonDB; a
 * small icon link next to it opens the Steam store page.
 *
 * Phones: the badge and the report count sit under the title, and the Steam
 * icon next to the title. From md up, the rating gets its own column.
 */
function GameRow({ game, hasPlaytime }: GameRowProps) {
	const { appId, name, tier } = game;
	const playtime = playtimeText(game, hasPlaytime);
	const reports = reportsText(game);
	const trending = trendingTier(game);
	const TrendIcon =
		trending && TIER_RANK[trending] > TIER_RANK[tier]
			? TrendingUp
			: TrendingDown;

	return (
		<LinkBox
			display="grid"
			gridTemplateColumns={{
				base: 'auto minmax(0, 1fr) auto',
				md: 'auto minmax(0, 1fr) 13rem auto',
			}}
			gridTemplateAreas={{
				base: '"thumb main steam" "thumb rating rating"',
				md: '"thumb main rating steam"',
			}}
			alignItems={{ base: 'start', md: 'center' }}
			columnGap={{ base: 2, md: 4 }}
			rowGap={1.5}
			p={2}
			// Shorthands first: the left border is wider and in the tier color.
			borderWidth="1px"
			borderColor="border"
			borderLeftWidth="4px"
			borderLeftColor={tierAccentColor(tier)}
			rounded="l2"
			bg="bg.panel"
			_hover={{ bg: 'bg.muted' }}
			css={rowCss}
		>
			<GameThumb gridArea="thumb" appId={appId} icon={game.icon} />

			<Box gridArea="main" minW={0}>
				<Text
					title={name}
					fontWeight="semibold"
					fontSize={{ base: 'sm', md: 'md' }}
					lineClamp={{ base: 2, md: 1 }}
					overflowWrap="anywhere"
				>
					<LinkOverlay
						href={`https://www.protondb.com/app/${appId}`}
						target="_blank"
						rel="noopener noreferrer"
						css={overlayCss}
					>
						{name}
						<VisuallyHidden> (opens ProtonDB in a new tab)</VisuallyHidden>
					</LinkOverlay>
				</Text>
				{playtime && (
					<Text fontSize="sm" color="fg.muted" mt={0.5}>
						{playtime}
					</Text>
				)}
			</Box>

			<Flex
				gridArea="rating"
				direction={{ base: 'row', md: 'column' }}
				wrap="wrap"
				align={{ base: 'center', md: 'flex-start' }}
				columnGap={2}
				rowGap={1}
				minW={0}
			>
				<TierBadge tier={tier} />
				{reports && (
					<Text fontSize="xs" color="fg.muted">
						{reports}
					</Text>
				)}
				{trending && (
					<Text
						fontSize="xs"
						color="fg.muted"
						display="inline-flex"
						alignItems="center"
						gap={1}
					>
						<TrendIcon aria-hidden size={14} />
						Trending: {TIERS[trending].label}
					</Text>
				)}
			</Flex>

			<Link
				gridArea="steam"
				href={`https://store.steampowered.com/app/${appId}`}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`Open ${name} on Steam`}
				boxSize={{ base: 8, md: 10 }}
				justifyContent="center"
				rounded="l2"
				color="fg.muted"
				_hover={{ color: 'fg', bg: 'bg.emphasized' }}
			>
				<FaSteam aria-hidden size={18} />
			</Link>
		</LinkBox>
	);
}

export default memo(GameRow);
