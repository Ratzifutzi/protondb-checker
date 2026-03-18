"use client";

import { StatsCache } from "@/app/api/stats/route";
import { Box, For, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState, useRef, Fragment } from "react";

function useCountUp(target: number, duration: number) {
	const [count, setCount] = useState(0);
	const startTimeRef = useRef<number | null>(null);
	const startValueRef = useRef<number>(0);
	const animationFrameRef = useRef<number | null>(null);

	useEffect(() => {
		startTimeRef.current = null;
		startValueRef.current = count;

		const animate = (timestamp: number) => {
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
	}, [target, duration, count]);

	return count;
}

function Ticker({ number, description }: { number: number, description: string }) {
	const animatedNumber = useCountUp(number, 500);
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

	useEffect(() => {
		const abortController = new AbortController();

		const fetchData = async () => {
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
				<Ticker number={data?.lastMonth || 0} description="Last 30 days" />
				<Ticker number={data?.total || 0} description="Total Checks" />
			</Box>
		</Box>
	)
}