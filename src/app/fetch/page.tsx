'use client';

import { Card, HStack, Skeleton, Stack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import CardFooter from '@/components/partials/footer';
import PageShell from '@/components/partials/pageShell';
import SyncSteps from '@/components/partials/syncSteps';
import { toaster } from '@/components/ui/toaster';
import {
	createCheckState,
	getCheckProgress,
	runCheck,
	type CheckProgressEvent,
	type CheckState,
} from '@/lib/checkLibrary';
import { saveResults, useStoredCheckInput } from '@/lib/storage';
import type { CheckInput } from '@/types/proton';

import CheckProgress from './components/CheckProgress';
import ProfileConfirm from './components/ProfileConfirm';

type Phase = 'confirm' | 'checking' | 'paused' | 'saving';

/** A started check: the input it was started with, and its progress. */
type ActiveCheck = { input: CheckInput; state: CheckState };

/** Stands in for the profile while it loads from storage. */
function ConfirmSkeleton() {
	return (
		<Stack gap={5}>
			<Skeleton h={8} w="16rem" maxW="full" />
			<HStack gap={4} p={4} borderWidth="1px" borderColor="border" rounded="l3">
				<Skeleton boxSize={16} flexShrink={0} rounded="l3" />
				<Stack gap={2} flex={1}>
					<Skeleton h={6} w="60%" />
					<Skeleton h={4} w="30%" />
				</Stack>
			</HStack>
			<Skeleton h={10} w={{ base: 'full', sm: '12rem' }} rounded="l2" />
		</Stack>
	);
}

export default function FetchPage() {
	const router = useRouter();
	// undefined while loading, null when /start staged nothing to check.
	const input = useStoredCheckInput();
	const [phase, setPhase] = useState<Phase>('confirm');
	const [progress, setProgress] = useState<CheckProgressEvent | null>(null);
	// Set after Cancel, so the confirm view takes the focus back.
	const [cancelled, setCancelled] = useState(false);

	// The running check keeps its own copy of the input: saveResults()
	// removes the staged input, so the live value turns null at the end.
	const checkRef = useRef<ActiveCheck | null>(null);
	const runRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (phase === 'confirm' && input === null) router.replace('/start');
	}, [phase, input, router]);

	// Stop the requests when the page goes away.
	useEffect(() => () => runRef.current?.abort(), []);

	// Ask before the tab closes or reloads while the check runs.
	useEffect(() => {
		if (phase !== 'checking') return;
		const warn = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Older browsers only ask when returnValue is set.
			event.returnValue = true;
		};
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [phase]);

	async function run(check: ActiveCheck) {
		runRef.current?.abort();
		const controller = new AbortController();
		runRef.current = controller;
		setPhase('checking');
		setProgress(getCheckProgress(check.state));

		const outcome = await runCheck(check.state, {
			signal: controller.signal,
			onProgress: setProgress,
		});
		// Cancel or a newer run took over.
		if (runRef.current !== controller) return;
		runRef.current = null;

		switch (outcome.status) {
			case 'done':
				setPhase('saving');
				// When storage is full the results stay in memory for this tab
				// and the results page says so, so go on either way.
				saveResults({
					profile: check.input.profile,
					games: check.input.games,
					summaries: [...check.state.results.values()],
					failed: [...check.state.failed],
					checkedAt: new Date().toISOString(),
				});
				router.replace('/results');
				break;
			case 'expired':
				toaster.create({
					type: 'warning',
					title: 'Session expired',
					description: 'Please solve the captcha again to continue.',
					duration: 10_000,
					closable: true,
				});
				router.push(
					`/start?steamid=${encodeURIComponent(check.input.profile.steamID)}`,
				);
				break;
			case 'error':
				console.error('The check stopped:', outcome.reason);
				setPhase('paused');
				break;
			case 'cancelled':
				// Only the unmount cleanup gets here. If React kept the page
				// around hidden, it comes back paused and can go on.
				setPhase('paused');
				break;
		}
	}

	function startCheck() {
		if (!input) return;
		const check: ActiveCheck = {
			input,
			state: createCheckState(input.games.map((entry) => entry.game.id)),
		};
		checkRef.current = check;
		void run(check);
	}

	function retryCheck() {
		if (checkRef.current) void run(checkRef.current);
	}

	function cancelCheck() {
		runRef.current?.abort();
		runRef.current = null;
		// The next check starts fresh.
		checkRef.current = null;
		setProgress(null);
		setPhase('confirm');
		setCancelled(true);
	}

	let content: ReactNode = null;
	if (phase === 'confirm') {
		content = input ? (
			<ProfileConfirm
				profile={input.profile}
				gameCount={input.games.length}
				onConfirm={startCheck}
				focusHeading={cancelled}
			/>
		) : (
			// Also shown for null, while the redirect to /start runs.
			<ConfirmSkeleton />
		);
	} else if (progress) {
		content = (
			<CheckProgress
				view={phase}
				progress={progress}
				onCancel={cancelCheck}
				onRetry={retryCheck}
			/>
		);
	}

	return (
		<PageShell>
			<Card.Body gap={6}>
				<SyncSteps currentStep={1} startOverHref="/start" />
				{content}
			</Card.Body>
			<CardFooter />
		</PageShell>
	);
}
