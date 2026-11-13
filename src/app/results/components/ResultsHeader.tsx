import {
	Avatar,
	Box,
	Flex,
	Heading,
	HStack,
	Link,
	Text,
	VisuallyHidden,
} from '@chakra-ui/react';

import { formatDate, pluralize } from '@/lib/format';
import type { StoredProfile } from '@/types/proton';

import ButtonLink from './ButtonLink';

type ResultsHeaderProps = {
	steamId: string;
	profile: StoredProfile;
	gameCount: number;
	/** ISO date of the check, null for saves that did not record it. */
	checkedAt: string | null;
};

/**
 * Whose library this is and when it was checked, with the links to check it
 * again or to check another profile. The buttons wrap below on phones.
 */
export default function ResultsHeader({
	steamId,
	profile,
	gameCount,
	checkedAt,
}: ResultsHeaderProps) {
	const avatar = profile.avatar.large ?? profile.avatar.medium;
	const games = pluralize(gameCount, 'game', 'games');
	const checked = checkedAt ? formatDate(checkedAt) : '';

	return (
		<Flex wrap="wrap" align="center" justify="space-between" gap={4}>
			<HStack gap={3} flex="1 1 auto" minW={0}>
				{/* Hidden from screen readers: the name follows right after. */}
				<Avatar.Root size={{ base: 'lg', md: 'xl' }} aria-hidden>
					<Avatar.Fallback name={profile.nickname} />
					{avatar && <Avatar.Image src={avatar} alt="" />}
				</Avatar.Root>
				<Box minW={0}>
					<Heading
						as="h1"
						size={{ base: 'lg', md: 'xl' }}
						overflowWrap="anywhere"
					>
						{profile.url ? (
							<Link
								href={profile.url}
								target="_blank"
								rel="noopener noreferrer"
								color="fg"
								display="inline"
							>
								{profile.nickname}
								<VisuallyHidden> (opens Steam in a new tab)</VisuallyHidden>
							</Link>
						) : (
							profile.nickname
						)}
					</Heading>
					<Text fontSize="sm" color="fg.muted">
						{checked ? `${games} · checked ${checked}` : games}
					</Text>
				</Box>
			</HStack>
			<HStack gap={2} wrap="wrap">
				<ButtonLink
					href={`/start?steamid=${encodeURIComponent(steamId)}`}
					size="sm"
					variant="outline"
				>
					Check again
				</ButtonLink>
				<ButtonLink href="/start" size="sm" variant="ghost">
					Check another profile
				</ButtonLink>
			</HStack>
		</Flex>
	);
}
