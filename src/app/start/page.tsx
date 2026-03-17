'use client';

import CardFooter from '@/components/partials/footer';
import SyncSteps from '@/components/partials/syncSteps';
import { AbsoluteCenter, Button, Card, Center, HStack } from '@chakra-ui/react';
import { useState } from 'react';
import ManualInput from './components/ManualInput';
import LinkAccount from './components/LinkAccount';

export default function Start() {
	const [syncMethod, setSyncMethod] = useState(0);

	return (
		<AbsoluteCenter>
			<Card.Root width={'90vw'} minHeight={'350px'} md={{ width: "600px" }}>
				<Card.Body>
					<Card.Header mb={4}>
						<SyncSteps currentStep={0} />
					</Card.Header>
					{syncMethod === 0 && (
						<>
							<Card.Description mb={8}>
								Link your steam account to check the compatibility of your games
								with ProtonDB. You can either use your SteamID or link your
								account directly.
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
