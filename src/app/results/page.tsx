'use client';

import { Card } from '@chakra-ui/react';
import type { ReactNode } from 'react';

import CardFooter from '@/components/partials/footer';
import PageShell from '@/components/partials/pageShell';
import SyncSteps from '@/components/partials/syncSteps';
import { useStoredResults } from '@/lib/storage';

import { NoResults } from './components/ResultsEmpty';
import ResultsSkeleton from './components/ResultsSkeleton';
import ResultsView from './components/ResultsView';

export default function ResultsPage() {
	// undefined while loading (server render and hydration), null when this
	// browser has no usable results.
	const data = useStoredResults();

	let content: ReactNode;
	if (data === undefined) {
		content = <ResultsSkeleton />;
	} else if (data === null) {
		content = <NoResults />;
	} else {
		// A new check (from another tab, for example) starts with fresh sort
		// and filter state.
		content = (
			<ResultsView key={`${data.steamId}:${data.checkedAt}`} data={data} />
		);
	}

	return (
		<PageShell width="wide" align="start">
			<Card.Body gap={6}>
				<SyncSteps currentStep={3} />
				{content}
			</Card.Body>
			<CardFooter />
		</PageShell>
	);
}
