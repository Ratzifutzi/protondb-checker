import { Button, Card, HStack, Text } from '@chakra-ui/react';

type props = {
	setSyncMethod: (id: number) => void;
};

export default function LinkAccount({ setSyncMethod }: props) {
	return (
		<>
			<HStack mb={5}>
				<Card.Description>
					Linking Steam Account to load games.
				</Card.Description>
				<Text
					onClick={() => {
						setSyncMethod(1);
					}}
					cursor={'pointer'}
					fontSize={'sm'}
					color={'blue.400'}
				>
					Use SteamID/Username instead.
				</Text>
			</HStack>
			<Text>Coming soon. Please enter SteamID manually</Text>
		</>
	);
}
