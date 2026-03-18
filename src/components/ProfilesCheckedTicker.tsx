"use client";

import { StatsCache } from "@/app/api/stats/route";
import { Box, Center, For, Spinner, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState, useRef, Fragment } from "react";

const DELAY_DURATION = 500;

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
			const currentCount = Math.floor(startValueRef.current + (target - startValueRef.current) * easeOut);

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

function Ticker({ number, description, loading }: { number: number, description: string, loading: boolean }) {
	const animatedNumber = useCountUp(number, 400);
	const paddedNumber = String(animatedNumber).padStart(4, "0");

	return (
		<>
			<VStack gap={0}>
				<Box
					height={"100%"}
					width={"100px"}
					bg={"bg.muted"}
					borderRadius={"md"}
					border={"1px solid"}
					borderColor={"border"}
					display={"flex"}
					flexDirection={"row"}
					alignItems={"center"}
				>
					{!loading ? (
						<For each={paddedNumber.split("")}>
							{(item, index) => (
								<Fragment key={`digit-group-${index}`}>
									<Text
										flex={1}
										fontSize={"xl"}
										fontFamily={"mono"}
										textAlign={"center"}
									>
										{item}
									</Text>
									{index !== 3 && (
										<Box
											height={"full"}
											width={"1px"}
											backgroundColor={"border"}
										/>
									)}
								</Fragment>
							)}
						</For>
					) : (
						<Center w={"full"} height={"full"}>
							<Spinner />
						</Center>
					)}
				</Box>
				<Text fontSize={"x-small"} fontWeight={"bold"} color={"fg.muted"} mt={0}>
					{description}
				</Text>
			</VStack>
		</>
	);
}

export default function ProfilesCheckedTicker() {
	const [data, setData] = useState<StatsCache | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		const abortController = new AbortController();

		const fetchData = async () => {
			setLoading(true);
			try {
				const response = await fetch('/api/stats', {
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const result = await response.json();
				setData(result);
			} catch (err) {
				console.log(err);
			} finally {
				setLoading(false)
			}
		};

		fetchData();

		// Cleanup function
		return () => {
			abortController.abort();
		};
	}, []);

	return (
		<Box>
			<Text textAlign={"center"} fontWeight={"bold"} mb={2}>Profiles checked</Text>
			<Box w={"100%"} height={"60px"} display={"flex"} justifyContent={"space-evenly"}>
				<Ticker number={data?.lastMonth || 0} description="Last 30 days" loading={loading} />
				<Ticker number={data?.total || 0} description="Total Checks" loading={loading} />
			</Box>
		</Box>
	)
}