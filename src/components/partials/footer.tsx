import { Box, Card, HStack, Link, Text, VStack } from '@chakra-ui/react';

const Separator = () => {
	return (
		<Box
			borderRadius={'full'}
			height={'4px'}
			width={'4px'}
			bgColor={'gray.600'}
		></Box>
	);
};

export default function CardFooter() {
	return (
		<Card.Footer justifyContent={'center'}>
			<VStack gap={0}>
				<Text color={"fg.subtle"} textAlign={"center"} fontSize={"x-small"} fontWeight={"normal"}>This site has no affiliation with Valve Software nor ProtonDB. All game images and logos are property of their respective owners.</Text>
				<HStack>
					<Link
						color={'blue.400'}
						fontSize={'sm'}
						target="_blank"
						href="https://github.com/Ratzifutzi/protondb-checker"
					>
						GitHub
					</Link>
					<Separator />
					<Link
						color={'blue.400'}
						fontSize={'sm'}
						target="_blank"
						href="https://donate.stripe.com/28EcN6flF9WP9uOdTz0VO0d"
					>
						Donate
					</Link>
					<Separator />
					<Link
						color={'blue.400'}
						fontSize={'sm'}
						target="_blank"
						href="https://www.protondb.com/"
					>
						ProtonDB
					</Link>
					<Separator />
					<Link
						color={'blue.400'}
						fontSize={'sm'}
						target="_blank"
						href="/privacy"
					>
						Privacy
					</Link>
				</HStack>
			</VStack>
		</Card.Footer>
	);
}
