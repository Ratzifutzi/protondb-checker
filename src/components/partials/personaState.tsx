import { Box, Center } from '@chakra-ui/react';

const steamPersonaColors = {
	0: 'gray',
	1: 'green',
	3: 'yellow',
};

export default function PersonaState({ persona }: { persona: 0 | 1 | 3 }) {
	return (
		<Box
			height={'12px'}
			width={'12px'}
			minW={'12px'}
			borderRadius={'full'}
			backgroundColor={steamPersonaColors[persona] || 'blue'}
		>
			<Center h={'full'} w={'full'}>
				<Box
					height={'8px'}
					width={'8px'}
					backgroundColor={'black'}
					borderRadius={'full'}
					opacity={0.75}
				/>
			</Center>
		</Box>
	);
}
