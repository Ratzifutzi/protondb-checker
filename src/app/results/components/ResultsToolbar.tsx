'use client';

import {
	Box,
	Button,
	CloseButton,
	Flex,
	Input,
	InputGroup,
	NativeSelect,
	Text,
	VisuallyHidden,
} from '@chakra-ui/react';
import { Search } from 'lucide-react';
import { type MouseEvent, type RefObject, useId } from 'react';

import { formatCount, pluralize } from '@/lib/format';

import { isSortKey, SORT_OPTIONS, type SortKey } from '../logic';

type ResultsToolbarProps = {
	search: string;
	onSearchChange: (value: string) => void;
	searchRef: RefObject<HTMLInputElement | null>;
	sortKey: SortKey;
	onSortChange: (key: SortKey) => void;
	/** Number of games in the list right now. */
	shown: number;
	/** Number of games in the library. */
	total: number;
	/** True when `shown` is the result of a search or a rating filter. */
	filtered: boolean;
	/** True when there is search text or a rating filter to clear. */
	canClear: boolean;
	onClearFilters: (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Search, sort and the game count. Sticks to the top of the window while the
 * list scrolls, across the full width of the card.
 */
export default function ResultsToolbar({
	search,
	onSearchChange,
	searchRef,
	sortKey,
	onSortChange,
	shown,
	total,
	filtered,
	canClear,
	onClearFilters,
}: ResultsToolbarProps) {
	const sortId = useId();
	const games = pluralize(total, 'game', 'games');

	const clearSearch = () => {
		onSearchChange('');
		// The clear button goes away, so keep focus in the field.
		searchRef.current?.focus({ preventScroll: true });
	};

	return (
		<Box
			data-sticky-toolbar=""
			position="sticky"
			top="env(safe-area-inset-top, 0px)"
			zIndex="sticky"
			bg="bg.panel"
			mx="calc(var(--card-padding) * -1)"
			px="var(--card-padding)"
			py={3}
			borderBottomWidth="1px"
			borderColor="border"
		>
			<Flex gap={2} align="center">
				<InputGroup
					flex="1"
					minW={0}
					startElement={<Search aria-hidden size={16} />}
					endElement={
						search ? (
							<CloseButton
								size="xs"
								aria-label="Clear search"
								onClick={clearSearch}
							/>
						) : undefined
					}
					endElementProps={{ px: 1 }}
				>
					<Input
						ref={searchRef}
						value={search}
						onChange={(event) => onSearchChange(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Escape' && search !== '') {
								event.preventDefault();
								onSearchChange('');
							}
						}}
						placeholder="Search your games"
						aria-label="Search games"
						inputMode="search"
						enterKeyHint="search"
						autoComplete="off"
						spellCheck={false}
						textOverflow="ellipsis"
					/>
				</InputGroup>

				<VisuallyHidden asChild>
					<label htmlFor={sortId}>Sort by</label>
				</VisuallyHidden>
				<NativeSelect.Root w="auto" flexShrink={0}>
					<NativeSelect.Field
						id={sortId}
						value={sortKey}
						onChange={(event) => {
							const { value } = event.currentTarget;
							if (isSortKey(value)) onSortChange(value);
						}}
					>
						{SORT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</NativeSelect.Field>
					<NativeSelect.Indicator />
				</NativeSelect.Root>
			</Flex>

			<Flex
				mt={2}
				minH={8}
				align="center"
				justify="space-between"
				wrap="wrap"
				columnGap={3}
			>
				<Text fontSize="sm" color="fg.muted" aria-live="polite" aria-atomic>
					{filtered ? `Showing ${formatCount(shown)} of ${games}` : games}
				</Text>
				{canClear && (
					<Button size="xs" variant="ghost" onClick={onClearFilters}>
						Clear filters
					</Button>
				)}
			</Flex>
		</Box>
	);
}
