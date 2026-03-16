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
				<Text color={"fg.subtle"} fontSize={"x-small"} fontWeight={"lighter"}>This site is not affiliated with ProtonDB.</Text>
				<HStack>
					<Link
						color={'blue.400'}
						fontSize={'sm'}
						target="_blank"
						href="https://github.com/"
					>
						GitHub
					</Link>
					<Separator />
					<Link
						color={'blue.400'}
						fontSize={'sm'}
						target="_blank"
						href="https://www.protondb.com/"
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
