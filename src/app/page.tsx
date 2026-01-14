'use client';

import CardFooter from '@/components/partials/footer';
import {
	AbsoluteCenter,
	Box,
	Button,
	Card,
	Center,
	HStack,
	Separator,
} from '@chakra-ui/react';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
	const [loadingNextPage, setLoadingNextPage] = useState(false);

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
						<Card.Description>
							This simple tool allows you to check all games in your steam
							library to see their ProtonDB Status, useful for Linux Gaming.
						</Card.Description>
					</Box>
					<>
						<Button
							loading={loadingNextPage}
							onClick={() => {
								setLoadingNextPage(true);
								window.location.href = '/start';
							}}
						>
							Start
						</Button>
					</>
				</Card.Body>
				<CardFooter />
			</Card.Root>
		</AbsoluteCenter>
	);
}
