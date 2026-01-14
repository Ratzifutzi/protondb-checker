'use client';

import { Center, Steps, Text } from '@chakra-ui/react';
import Image from 'next/image';

const steps = ['Load Games', 'Fetch Status', 'Result'];

export default function SyncSteps({ currentStep }: { currentStep: number }) {
	return (
		<>
			<Center gap={2}>
				<Image
					src={'/proton-logo.svg'}
					alt="ProtonDB Logo"
					width={32}
					height={32}
				/>
				<Text>ProtonDB Checker</Text>
			</Center>
			<Steps.Root defaultStep={currentStep} count={steps.length}>
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
