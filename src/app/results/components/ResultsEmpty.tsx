import {
	Button,
	EmptyState,
	Link,
	VisuallyHidden,
	VStack,
} from '@chakra-ui/react';
import { Gamepad2, Library, SearchX } from 'lucide-react';
import type { MouseEvent } from 'react';

import ButtonLink from './ButtonLink';

const PRIVACY_SETTINGS_URL = 'https://steamcommunity.com/my/edit/settings';

/** Nothing usable is stored in this browser. The page's main heading. */
export function NoResults() {
	return (
		<EmptyState.Root size={{ base: 'sm', md: 'md' }}>
			<EmptyState.Content>
				<EmptyState.Indicator>
					<Library />
				</EmptyState.Indicator>
				<VStack gap={1} textAlign="center">
					<EmptyState.Title as="h1">No results on this device</EmptyState.Title>
					<EmptyState.Description>
						Results are stored in this browser after a check.
					</EmptyState.Description>
				</VStack>
				<ButtonLink href="/start">Check a Steam library</ButtonLink>
			</EmptyState.Content>
		</EmptyState.Root>
	);
}

/** The check worked, but Steam returned no games for the profile. */
export function EmptyLibrary() {
	return (
		<EmptyState.Root size={{ base: 'sm', md: 'md' }}>
			<EmptyState.Content>
				<EmptyState.Indicator>
					<Gamepad2 />
				</EmptyState.Indicator>
				<VStack gap={1} textAlign="center">
					<EmptyState.Title as="h2">No games in this library</EmptyState.Title>
					<EmptyState.Description maxW="32rem">
						Steam did not return any games for this profile. If the game details
						are private, change them in your{' '}
						<Link
							href={PRIVACY_SETTINGS_URL}
							target="_blank"
							rel="noopener noreferrer"
							variant="underline"
							display="inline"
						>
							Steam privacy settings
							<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
						</Link>{' '}
						and check again.
					</EmptyState.Description>
				</VStack>
			</EmptyState.Content>
		</EmptyState.Root>
	);
}

/** The search and the rating filters together match no game. */
export function NoMatches({
	onClear,
}: {
	onClear: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<EmptyState.Root size="sm">
			<EmptyState.Content>
				<EmptyState.Indicator>
					<SearchX />
				</EmptyState.Indicator>
				<VStack gap={1} textAlign="center">
					<EmptyState.Title>No games match</EmptyState.Title>
					<EmptyState.Description>
						Try a different search or rating filter.
					</EmptyState.Description>
				</VStack>
				<Button size="sm" variant="outline" onClick={onClear}>
					Clear filters
				</Button>
			</EmptyState.Content>
		</EmptyState.Root>
	);
}
