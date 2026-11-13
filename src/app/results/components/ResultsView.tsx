'use client';

import { Alert, Box, Stack, VisuallyHidden } from '@chakra-ui/react';
import {
	type MouseEvent,
	useCallback,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
} from 'react';

import { toSearchKey } from '@/lib/format';
import type { TierKey } from '@/lib/protonTiers';
import type { StoredResults } from '@/lib/storage';

import {
	COMPARATORS,
	defaultSortKey,
	filterGames,
	type SortKey,
	summarize,
} from '../logic';
import GameList from './GameList';
import LibrarySummary from './LibrarySummary';
import { EmptyLibrary, NoMatches } from './ResultsEmpty';
import ResultsHeader from './ResultsHeader';
import ResultsToolbar from './ResultsToolbar';

/** True when the element has keyboard focus, not focus from a click or tap. */
function hasKeyboardFocus(element: Element): boolean {
	try {
		return element.matches(':focus-visible');
	} catch {
		// Browsers without :focus-visible.
		return false;
	}
}

type ResultsViewProps = { data: StoredResults };

/**
 * The results of a check: header, library summary, then the game list with
 * its sticky toolbar. Sorting and filtering are derived from the stored
 * games on each change; nothing is copied into state.
 */
export default function ResultsView({ data }: ResultsViewProps) {
	const { games, hasPlaytime } = data;

	const [sortKey, setSortKey] = useState<SortKey>(() =>
		defaultSortKey(hasPlaytime),
	);
	const [tiers, setTiers] = useState<ReadonlySet<TierKey>>(() => new Set());
	const [search, setSearch] = useState('');
	// Typing stays responsive in large libraries: the list follows a moment
	// later when React is busy.
	const query = useDeferredValue(toSearchKey(search));

	const summary = useMemo(() => summarize(games), [games]);
	const sorted = useMemo(
		() => [...games].sort(COMPARATORS[sortKey]),
		[games, sortKey],
	);
	const visible = useMemo(
		() => filterGames(sorted, tiers, query),
		[sorted, tiers, query],
	);

	const anchorRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);

	// When the list changes while the page is scrolled past the toolbar, go
	// back up so the list starts right under the toolbar again. Called from
	// event handlers only.
	const revealList = useCallback(() => {
		const anchor = anchorRef.current;
		if (!anchor) return;
		const top = anchor.getBoundingClientRect().top + window.scrollY;
		// 1px of slack for rounding, so a second call does not scroll again.
		if (window.scrollY > top + 1) {
			window.scrollTo({ top, behavior: 'instant' });
		}
	}, []);

	const changeSort = useCallback(
		(key: SortKey) => {
			setSortKey(key);
			revealList();
		},
		[revealList],
	);

	const changeSearch = useCallback(
		(value: string) => {
			setSearch(value);
			revealList();
		},
		[revealList],
	);

	const toggleTier = useCallback(
		(tier: TierKey) => {
			setTiers((current) => {
				const next = new Set(current);
				if (!next.delete(tier)) next.add(tier);
				return next;
			});
			revealList();
		},
		[revealList],
	);

	const clearFilters = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			// The button disappears, so keyboard users continue in the search.
			const moveFocus = hasKeyboardFocus(event.currentTarget);
			setSearch('');
			setTiers((current) => (current.size === 0 ? current : new Set()));
			revealList();
			if (moveFocus) searchRef.current?.focus({ preventScroll: true });
		},
		[revealList],
	);

	return (
		<Stack gap={6}>
			<ResultsHeader
				steamId={data.steamId}
				profile={data.profile}
				gameCount={games.length}
				checkedAt={data.checkedAt}
			/>

			{data.memoryOnly && (
				<Alert.Root status="warning">
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>
							Your browser storage is full, so these results are only kept until
							you reload or close this tab.
						</Alert.Title>
					</Alert.Content>
				</Alert.Root>
			)}

			{games.length === 0 ? (
				<EmptyLibrary />
			) : (
				<>
					<LibrarySummary
						summary={summary}
						hasPlaytime={hasPlaytime}
						failedCount={data.failedCount}
						selected={tiers}
						onToggle={toggleTier}
					/>

					{/* The toolbar sticks while this box is on screen. */}
					<Box>
						<VisuallyHidden as="h2">Games</VisuallyHidden>
						{/* Scroll target for revealList. Moved up by the top safe
						    area (the notch on some phones), as the toolbar sticks
						    below it. */}
						<Box
							ref={anchorRef}
							aria-hidden
							h="0"
							position="relative"
							top="calc(env(safe-area-inset-top, 0px) * -1)"
						/>
						<ResultsToolbar
							search={search}
							onSearchChange={changeSearch}
							searchRef={searchRef}
							sortKey={sortKey}
							onSortChange={changeSort}
							shown={visible.length}
							total={games.length}
							filtered={query !== '' || tiers.size > 0}
							canClear={search !== '' || tiers.size > 0}
							onClearFilters={clearFilters}
						/>
						<Box pt={3}>
							{visible.length > 0 ? (
								<GameList games={visible} hasPlaytime={hasPlaytime} />
							) : (
								<NoMatches onClear={clearFilters} />
							)}
						</Box>
					</Box>
				</>
			)}
		</Stack>
	);
}
