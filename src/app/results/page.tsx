/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import CardFooter from '@/components/partials/footer';
import SyncSteps from '@/components/partials/syncSteps';
import MoreGameInfo from '@/types/MoreGameInfo';
import { ProtonDbArray } from '@/types/ProtonDbArray';
import { AbsoluteCenter, Box, Button, Card, Center, Field, For, HStack, Image, Input, Skeleton, SkeletonText, Spinner, Text, VStack } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ExternalLinkIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
	GameInfo,
	GameInfoExtended,
	UserPlaytime,
	UserSummary,
} from 'steamapi';

type GameTypeArray = UserPlaytime<GameInfo | GameInfoExtended | MoreGameInfo>[];
type DataExport = {
	"games": GameTypeArray,
	"protonDbInfo": ProtonDbArray,
	"profile": UserSummary
}

const scoreColors = {
	"pending": "#000000",
	"unkown": "#000000",
	"borked": "#FF0000",
	"bronze": "#CD7F32",
	"silver": "#C0C0C0",
	"gold": "#FFD700",
	"platinum": "#90D5FF"
};
const tierValues = {
	"pending": 0,
	"unkown": -1,
	"borked": 1,
	"bronze": 2,
	"silver": 3,
	"gold": 4,
	"platinum": 5
};

const colorWithOpacity = (hex: string, opacity: number): string => {
	const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
	return `${hex}${alpha}`;
};

export default function Start() {
	const [games, setGames] = useState<GameTypeArray>([]);
	const [protonDbInfo, setProtonDbInfo] = useState<ProtonDbArray>([]);
	const [profile, setProfile] = useState<UserSummary | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [isPending, startTransition] = useTransition();
	const [lastSortIndex, setLastSortIndex] = useState<number>(0);
	const [searchValue, setSearchValue] = useState<string>("");

	const parentRef = useRef<HTMLDivElement>(null);

	const protonDbMap = useMemo(() => {
		const map = new Map<number, typeof protonDbInfo[0]>();
		protonDbInfo.forEach((item) => map.set(item.id, item));
		return map;
	}, [protonDbInfo]);

	const filteredGames = useMemo(() => {
		if (!searchValue) return games;
		return games.filter((game) =>
			game.game.name.toLowerCase().includes(searchValue.toLowerCase())
		);
	}, [games, searchValue]);

	const rowVirtualizer = useVirtualizer({
		count: filteredGames.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 85,
		overscan: 10,
	});

	const { share } = useParams();

	const router = useRouter()

	useEffect(() => {
		setLoading(true);
		const games = localStorage.getItem('games');
		const profile = localStorage.getItem('profile');
		const protonDb = localStorage.getItem("protonData");

		if (typeof share === "string") {
			const raw = atob(share)
			try {

			} catch {
				console.log("Could not decode string.");
			}
		}

		if (!games || !profile || !protonDb) {
			router.push('/');
		}

		const parsedGames: GameTypeArray = JSON.parse(games!)
		parsedGames.sort((a, b) => {
			return b.minutes - a.minutes;
		})

		setGames(parsedGames);
		setProfile(JSON.parse(profile!));
		setProtonDbInfo(JSON.parse(protonDb!))
		setLoading(false);
		setLastSortIndex(1)
	}, [router, share]);

	const handleSortByPlaytime = () => {
		startTransition(() => {
			const sortedGames = [...games].sort((a, b) => b.minutes - a.minutes);
			setGames(sortedGames);
			setLastSortIndex(1);
		});
	};

	const handleSortByScore = () => {
		startTransition(() => {
			const sortedGames = [...games].sort((a, b) => {
				const scoreA = protonDbMap.get(a.game.id)?.score ?? 0;
				const scoreB = protonDbMap.get(b.game.id)?.score ?? 0;
				return scoreB - scoreA;
			});
			setGames(sortedGames);
			setLastSortIndex(2);
		});
	};

	const handleSortByMedal = () => {
		startTransition(() => {
			const sortedGames = [...games].sort((a, b) => {
				const tierA = protonDbMap.get(a.game.id)?.tier ?? "unknown";
				const tierB = protonDbMap.get(b.game.id)?.tier ?? "unknown";
				const validTierA = tierA as keyof typeof tierValues;
				const validTierB = tierB as keyof typeof tierValues;
				return tierValues[validTierB] - tierValues[validTierA];
			});
			setGames(sortedGames);
			setLastSortIndex(3);
		});
	};

	return (
		<AbsoluteCenter>
			<Card.Root width={'600px'} minH={'750px'} maxH={"750px"} overflowY={loading ? "hidden" : "auto"} ref={parentRef}>
				<Card.Body>
					<Card.Header mb={4}>
						<SyncSteps currentStep={3} />
					</Card.Header>
					<SkeletonText noOfLines={1} height={21} mb={2} loading={!profile}>
						<Card.Description textAlign={"center"}>
							From the library of{" "}<strong>{profile?.nickname}</strong>
						</Card.Description>
					</SkeletonText>
					<Box gap={2} display={"flex"} flexDirection={"column"}>
						<VStack flex={1}>
							<Field.Root>
								<Input placeholder='Search for a game' value={searchValue} onChange={(e) => {
									setSearchValue(e.target.value)
								}} />
							</Field.Root>
							<HStack justifyContent={"center"} display={"flex"} width={"full"}>
								<Button variant={lastSortIndex === 1 ? "solid" : "surface"} disabled={loading} loading={isPending} flex={1} padding={0} onClick={handleSortByPlaytime}>
									Sort by Playtime
								</Button>

								<Button variant={lastSortIndex === 2 ? "solid" : "surface"} disabled={loading} loading={isPending} flex={1} padding={0} onClick={handleSortByScore}>
									Sort by Score
								</Button>

								<Button variant={lastSortIndex === 3 ? "solid" : "surface"} disabled={loading} loading={isPending} flex={1} padding={0} onClick={handleSortByMedal}>
									Sort by Medal
								</Button>
							</HStack>
						</VStack>
						{!loading && !isPending ? (
							<div
								style={{
									height: `${rowVirtualizer.getTotalSize()}px`,
									width: '100%',
									position: 'relative',
								}}
							>
								{rowVirtualizer.getVirtualItems().map((virtualRow) => {
									const item = filteredGames[virtualRow.index];
									const protonInfo = protonDbMap.get(item.game.id);

									const rawScore = protonInfo?.score ?? 0;
									const scoreValue = rawScore * 10;

									const tier = protonInfo?.tier ?? "unknown";
									const validTier = tier as keyof typeof scoreColors;
									const subtleColor = colorWithOpacity(scoreColors[validTier], 0.15);

									return (
										<Box
											key={item.game.id}
											style={{
												position: 'absolute',
												top: 0,
												left: 0,
												width: '100%',
												transform: `translateY(${virtualRow.start}px)`,
											}}
											bgGradient={`to-l`}
											gradientFrom={subtleColor}
											gradientTo="transparent"
											minH={"75px"}
											border={"1px solid"}
											borderColor={"border"}
											borderRadius={"md"}
											overflow={"hidden"}
										>
											<HStack>
												<Image
													src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${item.game.id}/header.jpg`}
													height={"75px"}
													minW={"160px"}
													bg={"bg.emphasized"}
													alt=' '
												/>
												<VStack
													alignItems={"flex-start"}
													gap={1}
													flex={1}
												>
													<Text fontWeight={"semibold"} maxW={"290px"} overflow={"hidden"} textOverflow={"ellipsis"} whiteSpace={"nowrap"}>
														{item.game.name}
													</Text>
													<Text fontSize={"sm"} color={"fg.muted"}>
														<strong>
															{protonInfo?.tier.toUpperCase() || 'Unknown'}
														</strong>
														{" "} - {(item.minutes / 60).toFixed(1)}h
													</Text>
												</VStack>
												<Text pr={3}>
													<strong>
														{scoreValue.toFixed(1)}
													</strong>
													{" "}/ 10
												</Text>
											</HStack>
										</Box>
									);
								})}
							</div>
						) : (
							<>
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
								<Skeleton height={"75px"} w={"full"} />
							</>
						)}
					</Box>
				</Card.Body>
				<CardFooter />
			</Card.Root>
		</AbsoluteCenter >
	);
}