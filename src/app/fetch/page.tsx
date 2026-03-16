/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import CardFooter from '@/components/partials/footer';
import PersonaState from '@/components/partials/personaState';
import SyncSteps from '@/components/partials/syncSteps';
import {
	AbsoluteCenter,
	Card,
	Center,
	HStack,
	IconButton,
	Image,
	Progress,
	Skeleton,
	VStack,
} from '@chakra-ui/react';
import { CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	Game,
	GameInfo,
	GameInfoExtended,
	UserPlaytime,
	UserSummary,
} from 'steamapi';

export default function Fetch() {
	const [games, setGames] = useState<
		UserPlaytime<Game | GameInfo | GameInfoExtended>[] | null
	>(null);
	const [profile, setProfile] = useState<UserSummary | null>(null);

	const [progress, setProgress] = useState<number>(-1);
	const [gamesCompleted, setGamesCompleted] = useState<number>(0)
	const [totalGames, setTotalGames] = useState<number>(0);
	const [, setErrors] = useState<string[]>([]);

	const router = useRouter()

	useEffect(() => {
		// Verify localstorage for profile and games
		const games = localStorage.getItem('games');
		const profile = localStorage.getItem('profile');

		if (!games || !profile) {
			router.push('/start');
		}

		setGames(JSON.parse(games!));
		setProfile(JSON.parse(profile!));
		setProgress(-1);
	}, [router]);

	// Prevent closing page
	useEffect(() => {
		if (progress > 0 && progress < 100) {
			window.onbeforeunload = () => {
				return "Closing this page will reset your progress."
			}
		} else {
			window.onbeforeunload = null
		}
	}, [progress])

	async function startFetch() {
		const gamesToProcess = games || [];
		const total = gamesToProcess.length;

		setProgress(0);
		setTotalGames(total);
		setGamesCompleted(0);
		setErrors([]);

		if (total === 0) {
			setProgress(100);
			return;
		}

		const results = [];
		for (const [index, game] of gamesToProcess.entries()) {
			const response = await fetch('/api/fetch', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ appId: game.game.id }),
			});

			if (!response.ok) {
				setErrors((prev) => [
					...prev,
					`Failed to fetch ProtonDB data for app ${game.game.id}`,
				]);
			} else {
				const data = await response.json();
				results.push(data);
			}

			const processed = index + 1;
			setGamesCompleted(processed);
			setProgress((processed / total) * 100);
		}

		console.log(results);
		localStorage.setItem('protonData', JSON.stringify(results));
		router.push('/results');
	}

	return (
		<AbsoluteCenter>
			<Card.Root width={'600px'} minHeight={'350px'}>
				<Card.Body>
					<Card.Header mb={4}>
						<SyncSteps currentStep={1} />
					</Card.Header>
					{progress === -1 && (
						<Center flexDirection={'column'} w={'full'}>
							<Card.Description mb={4} textAlign={'center'}>
								Is this your profile?
							</Card.Description>

							<HStack>
								<Card.Root flexDirection={'row'} overflow={'hidden'} w={'sm'}>
									<Skeleton loading={games === null} borderRadius={0}>
										<Image
											src={profile?.avatar.large}
											alt="Profile Avatar"
											height={'97px'}
											minW={'97px'}
										/>
									</Skeleton>

									<Card.Body>
										<Card.Title>
											<Skeleton w={'50%'} h={'28px'} loading={games === null}>
												{profile && (
													<Link href={profile.url} target="_blank">
														<HStack>
															{profile?.nickname}{' '}
															<PersonaState
																persona={profile?.personaState as 0 | 1 | 3}
															/>
														</HStack>
													</Link>
												)}
											</Skeleton>
										</Card.Title>
										<Card.Description color={games?.length === 0 ? "fg.error" : ""}>
											{games?.length || 0} games on account
											<br />
										</Card.Description>
									</Card.Body>
								</Card.Root>

								<VStack display={'flex'}>
									<IconButton variant={'surface'} onClick={startFetch} disabled={!games || games?.length == 0}>
										<CheckIcon />
									</IconButton>
									<IconButton
										variant={'outline'}
										onClick={() => {
											router.push('/start');
										}}
									>
										<XIcon />
									</IconButton>
								</VStack>
							</HStack>
						</Center>
					)}
					{progress >= 0 && (
						<Center>
							<VStack>
								<Card.Description>
									Please do not close this tab while your games are being
									checked.
								</Card.Description>
								<Progress.Root value={progress} w={'400px'} mt={12}>
									<Progress.Label mb="2">
										Checking games ({gamesCompleted}/{totalGames})
									</Progress.Label>
									<Progress.Track>
										<Progress.Range />
									</Progress.Track>
								</Progress.Root>
							</VStack>
						</Center>
					)}
				</Card.Body>
				<CardFooter />
			</Card.Root>
		</AbsoluteCenter>
	);
}
