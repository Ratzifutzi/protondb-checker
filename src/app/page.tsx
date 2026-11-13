'use client';

import {
	Avatar,
	Box,
	Card,
	createRecipeContext,
	Heading,
	HStack,
	LinkBox,
	LinkOverlay,
	Span,
	Stack,
	Text,
	type HTMLChakraProps,
	type RecipeProps,
} from '@chakra-ui/react';
import NextImage from 'next/image';
import NextLink from 'next/link';
import { LuChevronRight } from 'react-icons/lu';

import CardFooter from '@/components/partials/footer';
import PageShell from '@/components/partials/pageShell';
import ProfilesCheckedTicker from '@/components/ProfilesCheckedTicker';
import { formatDate, pluralize } from '@/lib/format';
import { type ResultsPreview, useResultsPreview } from '@/lib/storage';

type LinkButtonProps = HTMLChakraProps<'a', RecipeProps<'button'>>;

// A link with button styles. `<Button asChild>` would also put
// type="button" on the link, which is not valid on an anchor.
const { withContext: withButtonRecipe } = createRecipeContext({
	key: 'button',
});
const LinkButton = withButtonRecipe<HTMLAnchorElement, LinkButtonProps>('a');

/** The profile and date of the results saved on this device. */
function LastCheck({ preview }: { preview: ResultsPreview }) {
	const games = pluralize(preview.gameCount, 'game', 'games');
	const checkedOn = preview.checkedAt ? formatDate(preview.checkedAt) : '';

	return (
		<LinkBox
			p={4}
			borderWidth="1px"
			borderColor="border"
			rounded="l3"
			transitionProperty="colors"
			transitionDuration="fast"
			_hover={{ bg: 'bg.muted', borderColor: 'border.emphasized' }}
			// Fades in, since it only shows up once the page has loaded.
			animationName="fade-in"
			animationDuration="moderate"
		>
			<Heading as="h2" size="sm" color="fg.muted" mb={3}>
				Last check
			</Heading>
			<HStack align="start" gap={3}>
				{/* The nickname is right next to it, so the picture is decoration. */}
				<Avatar.Root size="lg" aria-hidden>
					<Avatar.Fallback name={preview.nickname} />
					{preview.avatar ? <Avatar.Image src={preview.avatar} alt="" /> : null}
				</Avatar.Root>
				<Stack gap={0.5} minW={0} flex={1}>
					<Text fontWeight="semibold" truncate>
						{preview.nickname}
					</Text>
					<Text fontSize="sm" color="fg.muted">
						{games}
						{checkedOn ? (
							<>
								{' · checked '}
								{/* Keeps the date on one line when the text wraps. */}
								<Span whiteSpace="nowrap">{checkedOn}</Span>
							</>
						) : null}
					</Text>
					<LinkOverlay
						asChild
						alignSelf="start"
						display="inline-flex"
						alignItems="center"
						gap={1}
						mt={1}
						fontSize="sm"
						fontWeight="medium"
						color="blue.fg"
						// The overlay covers the whole block, so the focus ring goes
						// around the block instead of around the link text.
						outline="none"
						_before={{ rounded: 'l3' }}
						_focusVisible={{
							_before: {
								outlineWidth: '2px',
								outlineStyle: 'solid',
								outlineColor: 'blue.focusRing',
								outlineOffset: '2px',
							},
						}}
					>
						<NextLink href="/results">
							View results
							<LuChevronRight aria-hidden />
						</NextLink>
					</LinkOverlay>
				</Stack>
			</HStack>
		</LinkBox>
	);
}

export default function Home() {
	// Undefined during the server render and hydration, null when nothing is
	// saved. Both render nothing, so first visits show no flash.
	const preview = useResultsPreview();

	return (
		<PageShell width="narrow">
			<Card.Body gap={6}>
				<Stack align="center" textAlign="center" gap={3}>
					<Box boxSize={{ base: '72px', sm: '94px' }}>
						<NextImage
							src="/proton-logo.svg"
							alt=""
							width={94}
							height={94}
							loading="eager"
							style={{ width: '100%', height: '100%' }}
						/>
					</Box>
					<Heading as="h1" size="2xl">
						ProtonDB Check
					</Heading>
					<Text color="fg.muted">
						Check how well the games in your Steam library run on Linux, based
						on ProtonDB reports.
					</Text>
				</Stack>
				<ProfilesCheckedTicker />
				<Stack gap={4}>
					<LinkButton asChild size="lg" w="full">
						<NextLink href="/start">Check a Steam library</NextLink>
					</LinkButton>
					{preview ? <LastCheck preview={preview} /> : null}
				</Stack>
			</Card.Body>
			<CardFooter />
		</PageShell>
	);
}
