'use client';

import CardFooter from '@/components/partials/footer';
import SyncSteps from '@/components/partials/syncSteps';
import {
	AbsoluteCenter,
	Box,
	Button,
	Card,
	Center,
	HStack,
	Input,
	Span,
	Text,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ManualInput from './components/ManualInput';
import LinkAccount from './components/LinkAccount';

export default function Start() {
	const [syncMethod, setSyncMethod] = useState(0);

	return (
		<AbsoluteCenter>
			<Card.Root width={'600px'} height={'350px'}>
				<Card.Body>
					<Card.Header mb={4}>
						<SyncSteps currentStep={0} />
					</Card.Header>
					{syncMethod === 0 && (
						<>
							<Card.Description mb={4}>
								In order to get all games in your steam library, you can
								manually enter your SteamID, or you can connect your Steam
								Account. Don't worry, I won't have acces to your password nor
								your personal details, only public details are shared. Your
								linked account won't be stored anywhere and will only be used to
								process your library.
							</Card.Description>
							<Center>
								<HStack width={'60%'} gap={5}>
									<Button
										onClick={() => {
											setSyncMethod(1);
										}}
										flex={1}
									>
										Use SteamID
									</Button>
									<Button
										onClick={() => {
											setSyncMethod(2);
										}}
										flex={1}
									>
										Link Account
									</Button>
								</HStack>
							</Center>
						</>
					)}
					{syncMethod === 1 && <ManualInput setSyncMethod={setSyncMethod} />}
					{syncMethod === 2 && <LinkAccount setSyncMethod={setSyncMethod} />}
				</Card.Body>

				<CardFooter />
			</Card.Root>
		</AbsoluteCenter>
	);
}
