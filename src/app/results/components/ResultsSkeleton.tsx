import {
	HStack,
	Skeleton,
	SkeletonCircle,
	Stack,
	VisuallyHidden,
} from '@chakra-ui/react';

const CHIPS = ['6rem', '5rem', '5.5rem', '7rem'];
const ROWS = [0, 1, 2, 3, 4, 5];

/**
 * Placeholder in the shape of the results (header, summary, toolbar and six
 * rows) while the stored results load. Shown during server rendering and
 * hydration only, as storage is read right after.
 */
export default function ResultsSkeleton() {
	return (
		<Stack gap={6}>
			<VisuallyHidden role="status">Loading results</VisuallyHidden>

			<HStack gap={3} aria-hidden>
				<SkeletonCircle size={{ base: '11', md: '12' }} />
				<Stack gap={2} flex="1">
					<Skeleton h="7" w="14rem" maxW="80%" />
					<Skeleton h="4" w="10rem" maxW="60%" />
				</Stack>
			</HStack>

			<Stack gap={4} aria-hidden>
				<Stack gap={2}>
					<Skeleton h="6" w="24rem" maxW="100%" />
					<Skeleton h="4" w="16rem" maxW="80%" />
				</Stack>
				<Skeleton h="10px" rounded="full" />
				<HStack gap={2} wrap="wrap">
					{CHIPS.map((width) => (
						<Skeleton key={width} h="9" w={width} rounded="full" />
					))}
				</HStack>
			</Stack>

			<Stack gap={3} aria-hidden>
				<Skeleton h="10" />
				<Stack gap={2}>
					{ROWS.map((row) => (
						<Skeleton key={row} h="84px" />
					))}
				</Stack>
			</Stack>
		</Stack>
	);
}
