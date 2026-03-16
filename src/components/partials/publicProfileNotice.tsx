import { Box, HStack, Text, VStack } from '@chakra-ui/react';

export default function PublicProfileNotice() {
	return (
		<Box
			w={'full'}
			minH={'50px'}
			bg={'yellow.900'}
			borderRadius={'md'}
			border={'1px solid'}
			borderColor={'yellow.500'}
			mb={2}
			p={2}
		>
			<HStack h={"100%"}>
				<VStack gap={0} justifyContent={"left"} alignItems={"left"}>
					<Text color={"yellow.500"} fontWeight={"black"} mb={0} textAlign={"left"}>Make sure your profile is public</Text>
					<Text fontSize={'sm'} color={'yellow.600'}>
						Your profile must be public to load your games. You can change this in your Steam privacy settings.
					</Text>
				</VStack>
			</HStack>
		</Box>
	);
}
