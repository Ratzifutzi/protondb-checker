'use client';

import CardFooter from '@/components/partials/footer';
import { ProtonDbArray } from '@/types/ProtonDbArray';
import {
	AbsoluteCenter,
	Box,
	Button,
	Card,
	Center,
	HStack,
	Separator,
	VStack,
} from '@chakra-ui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ProfilesCheckedTicker from '../components/ProfilesCheckedTicker';

export default function Home() {
	const [loading, setLoading] = useState<boolean>(true);
	const [protonDbInfo, setProtonDbInfo] = useState<ProtonDbArray>([]);
	const router = useRouter()

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLoading(true);
		// Verify localstorage for profile and games
		const protonDb = localStorage.getItem("protonData");

		setProtonDbInfo(JSON.parse(protonDb!))
		setLoading(false);
	}, [router]);

	return (
		<AbsoluteCenter>
			<Card.Root width={'320px'}>
				<Card.Body>
					<Box mb={5}>
						<Center>
							<Image
								src="/proton-logo.svg"
								alt="ProtonDB Logo"
								width={94}
								height={94}
							/>
						</Center>
						<HStack alignItems={'center'} mb={'3'}>
							<Separator flex={'1'} />
							<Card.Title flexShrink={'0'} textAlign={'center'}>
								ProtonDB Check
							</Card.Title>
							<Separator flex={'1'} />
						</HStack>
						<Card.Description mb={3}>
							This simple tool allows you to check all games in your steam
							library to see their ProtonDB Status, useful for Linux Gaming.
						</Card.Description>
						<ProfilesCheckedTicker />
					</Box>
					<Button
						loading={loading}
						mb={3}
						onClick={() => {
							setLoading(true);
							router.push("/start");
						}}
					>
						Start{protonDbInfo && " over"}
					</Button>
					{(protonDbInfo && !loading) && (
						<Button
							loading={loading}
							variant={"surface"}
							onClick={() => {
								setLoading(true);
								router.push("/results");
							}}
						>
							View previous results
						</Button>
					)}
				</Card.Body>
				<CardFooter />
			</Card.Root>
		</AbsoluteCenter>
	);
}
