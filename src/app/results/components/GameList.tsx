'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import {
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

import type { GameEntry } from '@/lib/storage';

import GameRow from './GameRow';

/** About the height of one row. Rows are measured once they render. */
const ROW_ESTIMATE = 84;

function estimateSize(): number {
	return ROW_ESTIMATE;
}

/**
 * Distance from the top of the document to the element. The window
 * virtualizer needs it as `scrollMargin`. `offsetTop` would not do: it is
 * relative to the card, not to the document.
 *
 * Measured whenever the page or the list's parent changes size, which is
 * when content above the list can have moved it.
 */
function useDocumentTop(ref: RefObject<HTMLElement | null>): number {
	const [top, setTop] = useState(0);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		// A ResizeObserver reports once right after observe(), so this also
		// takes the first measurement.
		const observer = new ResizeObserver(() => {
			setTop(Math.round(element.getBoundingClientRect().top + window.scrollY));
		});
		observer.observe(document.body);
		if (element.parentElement) observer.observe(element.parentElement);
		return () => observer.disconnect();
	}, [ref]);

	return top;
}

type GameListProps = {
	games: readonly GameEntry[];
	hasPlaytime: boolean;
};

/**
 * The games as a virtualized list. The page itself scrolls (there is no
 * inner scroll box) and only the rows near the window are in the DOM.
 */
export default function GameList({ games, hasPlaytime }: GameListProps) {
	const listRef = useRef<HTMLDivElement>(null);
	const scrollMargin = useDocumentTop(listRef);

	// Stable per list, so the virtualizer only redoes its layout when the
	// list itself changes.
	const getItemKey = useCallback(
		(index: number) => games[index]?.appId ?? index,
		[games],
	);

	const virtualizer = useWindowVirtualizer({
		count: games.length,
		estimateSize,
		overscan: 6,
		gap: 8,
		scrollMargin,
		getItemKey,
	});

	return (
		<div
			ref={listRef}
			role="list"
			style={{
				position: 'relative',
				height: virtualizer.getTotalSize(),
				// The virtualizer keeps the scroll position steady when rows above
				// the window change height; the browser must not do it too.
				overflowAnchor: 'none',
			}}
		>
			{virtualizer.getVirtualItems().map((item) => {
				const game = games[item.index];
				if (!game) return null;
				return (
					<div
						key={item.key}
						ref={virtualizer.measureElement}
						data-index={item.index}
						role="listitem"
						aria-setsize={games.length}
						aria-posinset={item.index + 1}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: '100%',
							transform: `translateY(${item.start - scrollMargin}px)`,
						}}
					>
						<GameRow game={game} hasPlaytime={hasPlaytime} />
					</div>
				);
			})}
		</div>
	);
}
