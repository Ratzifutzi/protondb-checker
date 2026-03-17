'use client';

import { Box, Button, Center, Link, Steps, Text } from '@chakra-ui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const steps = ['Load Games', 'Fetch Status', 'Result'];

export default function SyncSteps({ currentStep }: { currentStep: number }) {
	const router = useRouter();

	return (
		<Box display={"flex"} gap={2} flexDirection={{ base: "row", md: "column" }}>
			<Link position={"absolute"} left={3} top={3} fontSize={"md"} color={"fg.muted"} href='/'>Start over</Link>
			<Center gap={2}>
				<Image
					src={'/proton-logo.svg'}
					alt="ProtonDB Logo"
					width={32}
					height={32}
				/>
				<Text>ProtonDB Checker</Text>
			</Center>
			<Steps.Root defaultStep={currentStep} orientation={{ base: "vertical", md: "horizontal" }} order={{ base: -1, md: 1 }} justifyContent={"left"} count={steps.length} mt={1}>
				<Steps.List gap={{ base: 2, md: 0 }}>
					{steps.map((step, index) => (
						<Steps.Item key={index} index={index} title={step}>
							<Steps.Indicator />
							<Steps.Title>{step}</Steps.Title>
							<Steps.Separator />
						</Steps.Item>
					))}
				</Steps.List>
			</Steps.Root>
		</Box>
	);
}
