import { Box, Card } from '@chakra-ui/react';
import type { ReactNode } from 'react';

const MAX_WIDTHS = {
	narrow: '22rem',
	default: '40rem',
	wide: '56rem',
} as const;

type PageShellProps = {
	/** Usually `Card.Body` followed by `CardFooter`. */
	children: ReactNode;
	/** Card width limit: narrow 22rem, default 40rem, wide 56rem. */
	width?: 'narrow' | 'default' | 'wide';
	/**
	 * `center` centers the card in the window. `start` keeps it at the top, so
	 * it does not move around when its height changes.
	 */
	align?: 'center' | 'start';
};

/**
 * Page frame: the main landmark, at least as tall as the window, with one
 * card in it. The page itself scrolls; nothing here clips or sets overflow,
 * so sticky elements inside the card stick to the window.
 */
export default function PageShell({
	children,
	width = 'default',
	align = 'center',
}: PageShellProps) {
	return (
		<Box
			as="main"
			minH="100dvh"
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent={align === 'start' ? 'flex-start' : 'center'}
			px={{ base: 2, sm: 4 }}
			py={{ base: 3, md: 8 }}
		>
			<Card.Root
				w="full"
				maxW={MAX_WIDTHS[width]}
				// Less inner padding on small phones leaves room for content.
				css={{ '--card-padding': { base: 'spacing.4', sm: 'spacing.6' } }}
			>
				{children}
			</Card.Root>
		</Box>
	);
}
