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
import { useEffect, useRef, useState, useTransition } from 'react';
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
	// Convert opacity (0-1) to hex (00-FF)
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

	// Virtualizer setup
	const rowVirtualizer = useVirtualizer({
		count: games.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 85, // Estimate height of each row (75px + margins)
		overscan: 10, // Render a few extra rows above/below for smooth scrolling
	});

	const { share } = useParams();

	const router = useRouter()

	useEffect(() => {
		setLoading(true);
		// Verify localstorage for profile and games
		const games = localStorage.getItem('games');
		const profile = localStorage.getItem('profile');
		const protonDb = localStorage.getItem("protonData");

		// Check URL for base64 permalink
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
		// Sort by playtime
		parsedGames.sort((a, b) => {
			return b.minutes - a.minutes;
		})

		setGames(parsedGames);
		setProfile(JSON.parse(profile!));
		setProtonDbInfo(JSON.parse(protonDb!))
		setLoading(false);
		setLastSortIndex(1)
	}, [router, share]);

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
								<Button variant={lastSortIndex === 1 ? "solid" : "surface"} disabled={loading} loading={isPending} flex={1} padding={0} onClick={() => {
									startTransition(() => {
										const sortedGames = [...games].sort((a, b) => b.minutes - a.minutes);
										setGames(sortedGames);
										setLastSortIndex(1);
									});
								}}>
									Sort by Playtime
								</Button>

								<Button variant={lastSortIndex === 2 ? "solid" : "surface"} disabled={loading} loading={isPending} flex={1} padding={0} onClick={() => {
									startTransition(() => {
										const sortedGames = [...games].sort((a, b) => {
											const protonInfoA = protonDbInfo.find((e) => e.id === a.game.id);
											const protonInfoB = protonDbInfo.find((e) => e.id === b.game.id);

											const scoreA = protonInfoA?.score ?? 0
											const scoreB = protonInfoB?.score ?? 0

											return scoreB - scoreA;
										});

										setGames(sortedGames);
										setLastSortIndex(2);
									});
								}}>
									Sort by Score
								</Button>

								<Button variant={lastSortIndex === 3 ? "solid" : "surface"} disabled={loading} loading={isPending} flex={1} padding={0} onClick={() => {
									startTransition(() => {
										const sortedGames = [...games].sort((a, b) => {
											const protonInfoA = protonDbInfo.find((e) => e.id === a.game.id);
											const protonInfoB = protonDbInfo.find((e) => e.id === b.game.id);

											const tierA = protonInfoA?.tier ?? "unknown";
											const validTierA = tierA as keyof typeof tierValues;

											const tierB = protonInfoB?.tier ?? "unknown";
											const validTierB = tierB as keyof typeof tierValues;

											return tierValues[validTierB] - tierValues[validTierA];
										});

										setGames(sortedGames);
										setLastSortIndex(3)
									});
								}}>
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
									const item = games[virtualRow.index];
									const protonInfo = protonDbInfo.find((e) => e.id === item.game.id);

									if (searchValue !== "") {
										if (!item.game.name.toLowerCase().includes(searchValue.toLocaleLowerCase())) return;
									}

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
