import { Box, Button, Card, HStack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

type props = {
	setSyncMethod: (id: number) => void;
};

export default function LinkAccount({ setSyncMethod }: props) {
	const router = useRouter();

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
			<Box as={"ul"} listStyleType="circle" display={"flex"} flexDirection={"column"} gap={2} ml={5} mb={5} width={"90%"}>
				<li>
					Your Steam login credentials will not be shared.
				</li>
				<li>
					A unique numeric identifier will be shared with this page. Through this, this page will be able to identify your Steam community profile and access information about your Steam account according to your Profile Privacy Settings.
				</li>
				<li>
					Any information on your Steam Profile page that is set to be publicly viewable may be accessed by this page.
				</li>
			</Box>

			<Button w={"100%"} onClick={() => {
				router.push("/api/auth/steam/login/")
			}}>Sign in with Steam</Button>
		</>
	);
}
