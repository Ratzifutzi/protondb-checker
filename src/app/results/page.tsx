/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import CardFooter from '@/components/partials/footer';
import SyncSteps from '@/components/partials/syncSteps';
import MoreGameInfo from '@/types/MoreGameInfo';
import { ProtonDbArray } from '@/types/ProtonDbArray';
import { AbsoluteCenter, Box, Button, Card, For, HStack, Image, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	GameInfo,
	GameInfoExtended,
	UserPlaytime,
	UserSummary,
} from 'steamapi';

type GameTypeArray = UserPlaytime<GameInfo | GameInfoExtended | MoreGameInfo>[];


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

	const router = useRouter()

	useEffect(() => {
		setLoading(true);
		// Verify localstorage for profile and games
		const games = localStorage.getItem('games');
		const profile = localStorage.getItem('profile');
		const protonDb = localStorage.getItem("protonData");

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
	}, [router]);

	return (
		<AbsoluteCenter>
			<Card.Root width={'600px'} minH={'750px'} maxH={"750px"} overflowY={"scroll"}>
				<Card.Body>
					<Card.Header mb={4}>
						<SyncSteps currentStep={3} />
					</Card.Header>
					<Box gap={2} display={"flex"} flexDirection={"column"}>
						<HStack justifyContent={"center"}>
							<Button variant={"surface"} disabled={loading} onClick={() => {
								setLoading(true);
								const sortedGames = [...games].sort((a, b) => {
									return b.minutes - a.minutes;
								});

								setGames(sortedGames);
								setLoading(false);
							}}>
								Sort by Playtime
							</Button>

							<Button variant={"surface"} disabled={loading} onClick={() => {
								setLoading(true);
								const sortedGames = [...games].sort((a, b) => {
									const protonInfoA = protonDbInfo.find((e) => e.id === a.game.id);
									const protonInfoB = protonDbInfo.find((e) => e.id === b.game.id);

									const scoreA = protonInfoA?.score ?? 0
									const scoreB = protonInfoB?.score ?? 0

									return scoreB - scoreA;
								});

								setGames(sortedGames);
								setLoading(false);
							}}>
								Sort by Userscore
							</Button>

							<Button variant={"surface"} disabled={loading} onClick={() => {
								setLoading(true);
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
								setLoading(false);
							}}>
								Sort by medal
							</Button>
						</HStack>
						<For each={games}>
							{(item, index) => {
								const protonInfo = protonDbInfo.find((e) => e.id === item.game.id);

								const rawScore = protonInfo?.score ?? 0;
								const scoreValue = rawScore * 10;

								const tier = protonInfo?.tier ?? "unknown";
								const validTier = tier as keyof typeof scoreColors;
								const subtleColor = colorWithOpacity(scoreColors[validTier], 0.15);

								return (
									<Box
										key={index}
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
							}}
						</For>
					</Box>
				</Card.Body>
				<CardFooter />
			</Card.Root>
		</AbsoluteCenter >
	);
}
