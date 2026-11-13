'use client';

import {
	Box,
	Center,
	HStack,
	Spinner,
	Text,
	VisuallyHidden,
	VStack,
} from '@chakra-ui/react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { pluralize } from '@/lib/format';

const DELAY_DURATION = 500;

type Stats = { games: number; profiles: number };

function useCountUp(target: number, duration: number) {
	const [count, setCount] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const startValueRef = useRef<number>(0);
	const animationFrameRef = useRef<number | null>(null);
	const delayStartTimeRef = useRef<number | null>(null);

	useEffect(() => {
		startTimeRef.current = null;
		startValueRef.current = count;

		const animate = (timestamp: number) => {
			if (!delayStartTimeRef.current) {
				delayStartTimeRef.current = timestamp;
			}

			const elapsedSinceDelayStart = timestamp - delayStartTimeRef.current;

			// During delay period, keep the initial value
			if (elapsedSinceDelayStart < DELAY_DURATION) {
				animationFrameRef.current = requestAnimationFrame(animate);
				return;
			}

			// After delay, start the actual animation
			if (!startTimeRef.current) {
				startTimeRef.current = timestamp;
			}

			const elapsed = timestamp - startTimeRef.current;
			const progress = Math.min(elapsed / duration, 1);

			// Easing function for smooth animation (ease-out)
			const easeOut = 1 - Math.pow(1 - progress, 3);
			const currentCount = Math.floor(
				startValueRef.current + (target - startValueRef.current) * easeOut,
			);

			setCount(currentCount);

			if (progress < 1) {
				animationFrameRef.current = requestAnimationFrame(animate);
			}
		};

		animationFrameRef.current = requestAnimationFrame(animate);

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [count, target, duration]);

	return count;
}

/** A whole number of 0 or more. Anything else, such as -1 or text, gives 0. */
function toCount(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;
}

type TickerProps = {
	value: number;
	/** Shown under the digits. */
	caption: string;
	/** Singular and plural noun for the screen reader label. */
	one: string;
	other: string;
	loading: boolean;
};

function Ticker({ value, caption, one, other, loading }: TickerProps) {
	const animatedNumber = useCountUp(value, 400);
	const digits = String(animatedNumber).padStart(4, '0').split('');

	return (
		<VStack gap={1}>
			{/*
			 * The digit cells and the caption are hidden from screen readers.
			 * They get one plain label instead, such as "1,234 games checked",
			 * with the final number rather than the one that is counting up.
			 */}
			<Box
				aria-hidden
				display="flex"
				alignItems="center"
				h="11"
				minW="100px"
				bg="bg.muted"
				borderWidth="1px"
				borderColor="border"
				rounded="md"
			>
				{loading ? (
					<Center w="full" h="full">
						<Spinner />
					</Center>
				) : (
					digits.map((digit, index) => (
						<Fragment key={index}>
							{index > 0 && <Box h="full" w="1px" bg="border" />}
							<Text
								flex={1}
								minW="5"
								fontSize="xl"
								fontFamily="mono"
								textAlign="center"
							>
								{digit}
							</Text>
						</Fragment>
					))
				)}
			</Box>
			<Text aria-hidden fontSize="xs" fontWeight="bold" color="fg.muted">
				{caption}
			</Text>
			{!loading && (
				<VisuallyHidden>{`${pluralize(value, one, other)} checked`}</VisuallyHidden>
			)}
		</VStack>
	);
}

export default function ProfilesCheckedTicker() {
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		const fetchStats = async () => {
			try {
				const response = await fetch('/api/stats', {
					signal: controller.signal,
				});
				if (!response.ok) {
					throw new Error(
						`Stats request failed with status ${response.status}`,
					);
				}
				const body: unknown = await response.json();
				const record =
					typeof body === 'object' && body !== null
						? (body as Record<string, unknown>)
						: {};
				setStats({
					games: toCount(record.totalGames),
					profiles: toCount(record.total),
				});
			} catch (error) {
				// Leaving the page aborts the request on purpose.
				if (!controller.signal.aborted) {
					console.warn('Could not load the stats.', error);
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};

		void fetchStats();

		return () => {
			controller.abort();
		};
	}, []);

	const games = stats?.games ?? 0;
	const profiles = stats?.profiles ?? 0;

	return (
		<HStack justify="space-evenly" align="start" gap={4}>
			<Ticker
				value={games}
				caption="Games Checked"
				one="game"
				other="games"
				loading={loading}
			/>
			<Ticker
				value={profiles}
				caption="Profiles Checked"
				one="profile"
				other="profiles"
				loading={loading}
			/>
		</HStack>
	);
}
