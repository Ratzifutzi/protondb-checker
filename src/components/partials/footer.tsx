import {
	Box,
	Card,
	HStack,
	Link,
	Text,
	VisuallyHidden,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import type { ReactNode } from 'react';

const linkStyles = {
	colorPalette: 'blue',
	fontSize: 'sm',
	// A taller box makes the links easier to tap on phones.
	py: '1',
} as const;

/** Small dot between two links. Decoration only. */
function Dot() {
	return (
		<Box
			aria-hidden
			flexShrink={0}
			boxSize="4px"
			rounded="full"
			bg="fg.subtle"
		/>
	);
}

/** A link to another site. Opens in a new tab and tells screen readers so. */
function ExternalLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<Link {...linkStyles} href={href} target="_blank" rel="noopener noreferrer">
			{children}
			<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
		</Link>
	);
}

export default function CardFooter() {
	return (
		<Card.Footer flexDirection="column" gap={1} textAlign="center">
			<Text color="fg.muted" fontSize="xs">
				This site has no affiliation with Valve Software nor ProtonDB. All game
				images and logos are property of their respective owners.
			</Text>
			<HStack gap={2} justify="center" wrap="wrap" rowGap={0}>
				<ExternalLink href="https://github.com/Ratzifutzi/protondb-checker">
					GitHub
				</ExternalLink>
				<Dot />
				<ExternalLink href="https://donate.stripe.com/28EcN6flF9WP9uOdTz0VO0d">
					Donate
				</ExternalLink>
				<Dot />
				<ExternalLink href="https://www.protondb.com/">ProtonDB</ExternalLink>
				<Dot />
				<Link {...linkStyles} asChild>
					<NextLink href="/privacy">Privacy</NextLink>
				</Link>
			</HStack>
		</Card.Footer>
	);
}
