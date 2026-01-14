import { Box, Card, Link } from '@chakra-ui/react';

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
		</Card.Footer>
	);
}
