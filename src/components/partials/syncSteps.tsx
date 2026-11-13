'use client';

import {
	chakra,
	HStack,
	Link,
	Stack,
	Steps,
	useStepsStyles,
	VisuallyHidden,
} from '@chakra-ui/react';
import Image from 'next/image';
import NextLink from 'next/link';
import type { ReactNode } from 'react';

const STEPS = ['Find profile', 'Check games', 'Results'] as const;

type SyncStepsProps = {
	/** Index of the step the user is on. 3 means all three steps are done. */
	currentStep: number;
	/** When set, a "Start over" link to this address shows on the right. */
	startOverHref?: string;
};

/** Ark throws for a step outside 0 to count, so keep it in range. */
function clampStep(step: number): number {
	if (!Number.isFinite(step)) return 0;
	return Math.min(Math.max(Math.trunc(step), 0), STEPS.length);
}

/**
 * The list of steps as an ordered list. Ark's own list element sets
 * role="tablist" and points aria-owns at step triggers, which only fits
 * clickable steps; these steps only show progress.
 */
function StepList({ children }: { children: ReactNode }) {
	const styles = useStepsStyles();
	return (
		<chakra.ol
			css={styles.list}
			aria-label="Progress"
			alignItems="flex-start"
			listStyleType="none"
			m="0"
			p="0"
		>
			{children}
		</chakra.ol>
	);
}

/**
 * Header row (logo and name linking home, optional "Start over") above the
 * three steps. Each label sits under its circle, so the steps fit a 360px
 * wide screen without wrapping into each other.
 */
export default function SyncSteps({
	currentStep,
	startOverHref,
}: SyncStepsProps) {
	const step = clampStep(currentStep);

	return (
		<Stack gap={4}>
			<HStack justify="space-between" gap={3} minH={9}>
				<Link asChild color="fg" fontWeight="semibold" gap={2}>
					<NextLink href="/">
						<Image
							src="/proton-logo.svg"
							alt=""
							width={28}
							height={28}
							loading="eager"
						/>
						ProtonDB Check
					</NextLink>
				</Link>
				{startOverHref && (
					// A link styled like a small ghost button, with a 36px tall target.
					<Link
						asChild
						fontSize="sm"
						fontWeight="medium"
						color="fg.muted"
						minH={9}
						px={3}
						rounded="l2"
						_hover={{ bg: 'bg.muted', color: 'fg', textDecoration: 'none' }}
					>
						<NextLink href={startOverHref}>Start over</NextLink>
					</Link>
				)}
			</HStack>

			<Steps.Root
				step={step}
				count={STEPS.length}
				size="sm"
				orientation="horizontal"
			>
				<StepList>
					{STEPS.map((title, index) => (
						<Steps.Item
							key={title}
							index={index}
							asChild
							flexDirection="column"
							alignItems="center"
							gap={1.5}
							minW={0}
							textAlign="center"
							// The recipe shrinks the last step to its content; every step
							// gets the same width here so the connectors line up.
							css={{ '&:last-of-type': { flex: '1 0 0' } }}
						>
							<li>
								<Steps.Indicator />
								<Steps.Title
									color={index > step ? 'fg.muted' : 'fg'}
									lineHeight="short"
								>
									{title}
									{index < step && <VisuallyHidden> (done)</VisuallyHidden>}
								</Steps.Title>
								{index < STEPS.length - 1 && (
									// Connects this circle to the next one. Items are equal
									// width, so the next circle's center is 100% away.
									<Steps.Separator
										position="absolute"
										top="calc((var(--steps-size) - var(--steps-thickness)) / 2)"
										insetStart="calc(50% + var(--steps-size) / 2 + var(--steps-gutter))"
										width="calc(100% - var(--steps-size) - 2 * var(--steps-gutter))"
										mx="0"
									/>
								)}
							</li>
						</Steps.Item>
					))}
				</StepList>
			</Steps.Root>
		</Stack>
	);
}
