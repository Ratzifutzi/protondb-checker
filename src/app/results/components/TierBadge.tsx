import { Badge } from '@chakra-ui/react';

import { TIERS, tierStyleProps, type TierKey } from '@/lib/protonTiers';

/** Badge text for the tiers whose short label reads oddly on its own. */
const BADGE_TEXT: Partial<Record<TierKey, string>> = {
	none: 'No reports yet',
	unchecked: 'Could not check',
};

/**
 * The rating of one game. Solid tiers are filled with their color, games
 * without reports get an outline and games ProtonDB did not answer for a
 * dashed outline. The text always names the rating.
 */
export default function TierBadge({ tier }: { tier: TierKey }) {
	return (
		<Badge size="md" {...tierStyleProps(tier)}>
			{BADGE_TEXT[tier] ?? TIERS[tier].label}
		</Badge>
	);
}
