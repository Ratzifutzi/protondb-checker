import {
	Alert,
	Button,
	Heading,
	HStack,
	Progress,
	Spinner,
	Stack,
	Text,
} from '@chakra-ui/react';
import { useEffect, useId, useRef } from 'react';

import type { CheckProgressEvent } from '@/lib/checkLibrary';
import { formatCount, pluralize } from '@/lib/format';

export type CheckProgressView = 'checking' | 'paused' | 'saving';

type CheckProgressProps = {
	progress: CheckProgressEvent;
	/**
	 * `checking` while requests run, `paused` after the check stopped on an
	 * error, `saving` once every game has an answer.
	 */
	view: CheckProgressView;
	onCancel: () => void;
	onRetry: () => void;
};

const MINUTE_MS = 60_000;

/** "About 3 min left" (rounded up) or "Less than a minute left". */
function timeLeft(etaMs: number | null): string | null {
	if (etaMs === null) return null;
	if (etaMs < MINUTE_MS) return 'Less than a minute left';
	return `About ${formatCount(Math.ceil(etaMs / MINUTE_MS))} min left`;
}

/** The line under the bar: why the check waits, what it does, or time left. */
function statusLine(progress: CheckProgressEvent): string | null {
	switch (progress.waiting) {
		case 'throttled':
			return 'ProtonDB is busy. Waiting a few seconds before going on.';
		case 'busy':
			return 'The server is busy. Waiting a few seconds before going on.';
		case 'retrying':
			return 'The server did not answer. Trying again.';
	}
	if (progress.phase === 'sweep') return 'Looking up saved ratings';
	if (progress.phase === 'retry') {
		const games = pluralize(progress.retryCount ?? 0, 'game', 'games');
		return `Trying ${games} again`;
	}
	return timeLeft(progress.etaMs);
}

/** Progress of a running check, and the paused and saving states after it. */
export default function CheckProgress({
	progress,
	view,
	onCancel,
	onRetry,
}: CheckProgressProps) {
	const labelId = useId();
	const headingRef = useRef<HTMLHeadingElement>(null);
	const retryRef = useRef<HTMLButtonElement>(null);

	// The button that led here is gone, so focus would fall back to the page.
	// Paused: go to "Try again". Otherwise: go to the heading, unless the
	// focus is still somewhere useful.
	useEffect(() => {
		if (view === 'paused') {
			retryRef.current?.focus();
		} else if (
			document.activeElement === null ||
			document.activeElement === document.body
		) {
			headingRef.current?.focus();
		}
	}, [view]);

	const total = Math.max(0, progress.total);
	const done =
		view === 'saving' ? total : Math.min(Math.max(0, progress.done), total);
	const running = view === 'checking';

	return (
		<Stack gap={6}>
			<Heading as="h1" size="2xl" ref={headingRef} tabIndex={-1} outline="none">
				Checking your games
			</Heading>

			{/* Count and status line share one polite live region. Each is a
			    single string, so screen readers read the whole sentence. */}
			<Progress.Root
				value={done}
				// Ark throws when the value is above max, and divides by max.
				max={Math.max(total, 1)}
				ids={{ label: labelId }}
				striped={running}
				animated={running}
				aria-live="polite"
			>
				<Progress.Label mb={2}>
					{`${formatCount(done)} of ${formatCount(total)} games checked`}
				</Progress.Label>
				{/* Ark names the bar after its percentage; the label says more. */}
				<Progress.Track aria-labelledby={labelId}>
					<Progress.Range _motionReduce={{ animation: 'none' }} />
				</Progress.Track>
				{running ? (
					<Text mt={2} minH={5} textStyle="sm" color="fg.muted">
						{statusLine(progress)}
					</Text>
				) : null}
				{view === 'saving' ? (
					<HStack mt={2} gap={2} textStyle="sm" color="fg.muted">
						<Spinner size="xs" />
						<Text>Done. Opening your results</Text>
					</HStack>
				) : null}
			</Progress.Root>

			{running ? (
				<Stack gap={3} align="flex-start">
					<Text>Keep this tab open until the check is done.</Text>
					<Text textStyle="sm" color="fg.muted">
						Games nobody has reported on ProtonDB yet, such as tools and
						soundtracks, are listed as No reports.
					</Text>
					<Button variant="outline" mt={2} onClick={onCancel}>
						Cancel
					</Button>
				</Stack>
			) : null}

			{view === 'paused' ? (
				<Stack gap={4}>
					<Alert.Root status="warning" role="alert">
						<Alert.Indicator />
						<Alert.Content>
							<Alert.Title>The check stopped</Alert.Title>
							<Alert.Description>
								The server did not answer. Your progress so far is kept.
							</Alert.Description>
						</Alert.Content>
					</Alert.Root>
					<Stack direction={{ base: 'column', sm: 'row' }} gap={3}>
						<Button ref={retryRef} onClick={onRetry}>
							Try again
						</Button>
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
					</Stack>
				</Stack>
			) : null}
		</Stack>
	);
}
