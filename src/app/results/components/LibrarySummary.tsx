'use client';

import {
	Box,
	type BoxProps,
	Button,
	Flex,
	Heading,
	Stack,
	Text,
} from '@chakra-ui/react';
import { Check } from 'lucide-react';
import { memo } from 'react';

import { Tooltip } from '@/components/ui/tooltip';
import { formatCount, formatPercent, pluralize } from '@/lib/format';
import {
	TIER_ORDER,
	TIERS,
	tierAccentColor,
	type TierKey,
} from '@/lib/protonTiers';

import type { ResultsSummary } from '../logic';

const STRIPES =
	'repeating-linear-gradient(135deg, {colors.fg.subtle} 0 2px, transparent 2px 4px)';

/**
 * Fill of a bar segment and of the matching chip dot, so the chips double as
 * the legend of the bar. Rated tiers use their color, games without reports
 * a muted gray and games that could not be checked gray stripes.
 */
function swatch(tier: TierKey): BoxProps {
	const fill = TIERS[tier].bg;
	if (fill) return { bgColor: fill };
	if (tier === 'unchecked') return { bgColor: 'bg.muted', bgImage: STRIPES };
	return { bgColor: tierAccentColor(tier) };
}

/** "287 of 412 games run well (Gold or better)", with matching grammar. */
function headline(runsWell: number, total: number): string {
	const verb = runsWell === 1 || total === 1 ? 'runs' : 'run';
	const games = pluralize(total, 'game', 'games');
	return `${formatCount(runsWell)} of ${games} ${verb} well (Gold or better)`;
}

/** Tooltip of a bar segment, for example "Gold: 167 games (40%)". */
function segmentText(tier: TierKey, count: number, total: number): string {
	const games = pluralize(count, 'game', 'games');
	return `${TIERS[tier].label}: ${games} (${formatPercent(count / total)})`;
}

/** The line under the headline, or null when there is nothing to say. */
function playtimeNote(summary: ResultsSummary, hasPlaytime: boolean) {
	if (!hasPlaytime) return 'Steam did not share playtime for this profile.';
	if (summary.playtimeShare === null || summary.runsWell === 0) return null;
	const share = formatPercent(summary.playtimeShare);
	return `Those games make up ${share} of your playtime.`;
}

type LibrarySummaryProps = {
	summary: ResultsSummary;
	hasPlaytime: boolean;
	failedCount: number;
	/** Tiers the list is filtered to. Empty means all tiers. */
	selected: ReadonlySet<TierKey>;
	onToggle: (tier: TierKey) => void;
};

/**
 * Overview of the library: how many games run well, a bar with the share of
 * each tier, and one filter chip per tier.
 */
function LibrarySummary({
	summary,
	hasPlaytime,
	failedCount,
	selected,
	onToggle,
}: LibrarySummaryProps) {
	const { total, counts, runsWell } = summary;
	const note = playtimeNote(summary, hasPlaytime);
	const tiers = TIER_ORDER.filter((tier) => counts[tier] > 0);
	const barLabel = `Games by rating: ${tiers
		.map((tier) => `${TIERS[tier].label} ${formatCount(counts[tier])}`)
		.join(', ')}`;

	return (
		<Stack gap={4}>
			<Stack gap={1}>
				<Heading as="h2" size={{ base: 'md', md: 'lg' }}>
					{headline(runsWell, total)}
				</Heading>
				{note && (
					<Text fontSize="sm" color="fg.muted">
						{note}
					</Text>
				)}
			</Stack>

			<Flex
				role="img"
				aria-label={barLabel}
				h="10px"
				gap="2px"
				rounded="full"
				overflow="hidden"
			>
				{tiers.map((tier) => (
					<Tooltip
						key={tier}
						content={segmentText(tier, counts[tier], total)}
						openDelay={150}
						positioning={{ placement: 'top' }}
					>
						<Box
							flexGrow={counts[tier]}
							flexBasis="0"
							minW="2px"
							{...swatch(tier)}
						/>
					</Tooltip>
				))}
			</Flex>

			<Flex role="group" aria-label="Filter by rating" wrap="wrap" gap={2}>
				{tiers.map((tier) => {
					const active = selected.has(tier);
					return (
						<Tooltip key={tier} content={TIERS[tier].description}>
							<Button
								size="sm"
								variant="outline"
								rounded="full"
								px={3}
								aria-pressed={active}
								onClick={() => onToggle(tier)}
								_pressed={{
									bg: 'bg.emphasized',
									borderColor: 'border.inverted',
								}}
							>
								<Box
									as="span"
									aria-hidden
									boxSize="2.5"
									rounded="full"
									flexShrink={0}
									{...swatch(tier)}
								/>
								{TIERS[tier].label}
								<Text
									as="span"
									color="fg.muted"
									fontVariantNumeric="tabular-nums"
								>
									{formatCount(counts[tier])}
								</Text>
								{active && <Check aria-hidden />}
							</Button>
						</Tooltip>
					);
				})}
			</Flex>

			{(counts.none > 0 || failedCount > 0) && (
				<Stack gap={1} fontSize="xs" color="fg.muted">
					{counts.none > 0 && (
						<Text>
							No reports means nobody has rated the game on ProtonDB yet. This
							is common for tools, soundtracks and demos.
						</Text>
					)}
					{failedCount > 0 && (
						<Text>
							{pluralize(failedCount, 'game', 'games')} could not be checked
							because ProtonDB did not answer. Use Check again to retry.
						</Text>
					)}
				</Stack>
			)}
		</Stack>
	);
}

export default memo(LibrarySummary);
