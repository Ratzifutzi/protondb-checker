'use client';

import { Button, Card, Field, HStack, Input, Text } from '@chakra-ui/react';

type props = {
	setSyncMethod: (id: number) => void;
};

export default function ManualInput({ setSyncMethod }: props) {
	return (
		<>
			<HStack mb={5}>
				<Card.Description>Using SteamID to load games.</Card.Description>
				<Text
					onClick={() => {
						setSyncMethod(2);
					}}
					cursor={'pointer'}
					fontSize={'sm'}
					color={'blue.400'}
				>
					Link account instead
				</Text>
			</HStack>
			<HStack>
				<Field.Root required>
					<Field.Label>
						SteamID <Field.RequiredIndicator />
					</Field.Label>
					<Input type="text" placeholder="Enter your SteamID"></Input>
					<Field.HelperText color={'blue.400'} cursor={'button'}>
						How do I find this?
					</Field.HelperText>
				</Field.Root>
				<Button>Check ID</Button>
			</HStack>
		</>
	);
}
