'use client';

import { Button, Center, Steps, Text } from '@chakra-ui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const steps = ['Load Games', 'Fetch Status', 'Result'];

export default function SyncSteps({ currentStep }: { currentStep: number }) {
	const router = useRouter();

	return (
		<>
			<Button position={"absolute"} size={"xs"} variant={"ghost"} color={"fg.subtle"} left={3} top={3} onClick={() => {
				router.push("/")
			}}>Start over</Button>
			<Center gap={2}>
				<Image
					src={'/proton-logo.svg'}
					alt="ProtonDB Logo"
					width={32}
					height={32}
				/>
				<Text>ProtonDB Checker</Text>
			</Center>
			<Steps.Root defaultStep={currentStep} count={steps.length} mt={1}>
				<Steps.List>
					{steps.map((step, index) => (
						<Steps.Item key={index} index={index} title={step}>
							<Steps.Indicator />
							<Steps.Title>{step}</Steps.Title>
							<Steps.Separator />
						</Steps.Item>
					))}
				</Steps.List>
			</Steps.Root>
		</>
	);
}
