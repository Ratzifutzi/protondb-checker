import {
	Alert,
	Avatar,
	Button,
	createRecipeContext,
	Heading,
	HStack,
	Link,
	List,
	Stack,
	Text,
	VisuallyHidden,
	type HTMLChakraProps,
	type RecipeProps,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useEffect, useRef } from 'react';
import { LuExternalLink } from 'react-icons/lu';

import PersonaState from '@/components/partials/personaState';
import { pluralize } from '@/lib/format';
import type { StoredProfile } from '@/types/proton';

type LinkButtonProps = HTMLChakraProps<'a', RecipeProps<'button'>>;

// A link with button styles. `<Button asChild>` would also put
// type="button" on the link, which is not valid on an anchor.
const { withContext: withButtonRecipe } = createRecipeContext({
	key: 'button',
});
const LinkButton = withButtonRecipe<HTMLAnchorElement, LinkButtonProps>('a');

const PRIVACY_SETTINGS_URL = 'https://steamcommunity.com/my/edit/settings';

/** The Steam name, linking to the profile when there is a link. */
function ProfileName({ profile }: { profile: StoredProfile }) {
	// Long names without spaces wrap instead of pushing the card wider.
	const nameStyles = {
		fontWeight: 'semibold',
		textStyle: 'lg',
		minW: 0,
		overflowWrap: 'anywhere',
	} as const;

	if (!profile.url) {
		return <Text {...nameStyles}>{profile.nickname}</Text>;
	}
	return (
		<Link
			{...nameStyles}
			href={profile.url}
			target="_blank"
			rel="noopener noreferrer"
			color="fg"
		>
			{profile.nickname}
			<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
		</Link>
	);
}

/** Why Steam returned no games, and how to fix it. */
function PrivacyHelp({ visible }: { visible?: boolean }) {
	return (
		<Alert.Root status="warning">
			<Alert.Indicator />
			<Alert.Content gap={2}>
				<Alert.Title>
					{visible === false ? 'This profile is private' : 'No games found'}
				</Alert.Title>
				<Alert.Description>
					Steam only shares games when the profile and its game details are
					public.
				</Alert.Description>
				<List.Root
					as="ol"
					ps={5}
					gap={1}
					// The default gray numbers are too faint on the warning color.
					css={{ '& li::marker': { color: 'inherit' } }}
				>
					<List.Item>
						<Link
							href={PRIVACY_SETTINGS_URL}
							target="_blank"
							rel="noopener noreferrer"
							variant="underline"
							fontWeight="medium"
						>
							Open your Steam privacy settings
							<LuExternalLink aria-hidden />
							<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
						</Link>
					</List.Item>
					<List.Item>Set My profile and Game details to Public</List.Item>
					<List.Item>Untick Always keep my total playtime private</List.Item>
					<List.Item>Come back and start over</List.Item>
				</List.Root>
			</Alert.Content>
		</Alert.Root>
	);
}

type ProfileConfirmProps = {
	profile: StoredProfile;
	gameCount: number;
	/** Starts the check. Only offered when there are games to check. */
	onConfirm: () => void;
	/** Moves focus to the heading when shown, for example after Cancel. */
	focusHeading?: boolean;
};

/**
 * Asks the visitor to confirm the profile before the check starts. With no
 * games, explains the Steam privacy settings instead.
 */
export default function ProfileConfirm({
	profile,
	gameCount,
	onConfirm,
	focusHeading = false,
}: ProfileConfirmProps) {
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		if (focusHeading) headingRef.current?.focus();
	}, [focusHeading]);

	// The large avatar stays sharp on high density screens.
	const avatar = profile.avatar.large ?? profile.avatar.medium;
	const games = pluralize(gameCount, 'game', 'games');

	return (
		<Stack gap={5}>
			<Heading as="h1" size="2xl" ref={headingRef} tabIndex={-1} outline="none">
				Is this your profile?
			</Heading>

			<HStack gap={4} p={4} borderWidth="1px" borderColor="border" rounded="l3">
				{/* The name is right next to it, so the picture is decoration. */}
				<Avatar.Root size="2xl" shape="rounded" aria-hidden>
					<Avatar.Fallback />
					{avatar ? <Avatar.Image src={avatar} alt="" /> : null}
				</Avatar.Root>
				<Stack gap={0.5} minW={0} flex={1}>
					<HStack gap={2} minW={0}>
						<ProfileName profile={profile} />
						<PersonaState persona={profile.personaState} />
					</HStack>
					<Text textStyle="sm" color="fg.muted">
						{games}
					</Text>
				</Stack>
			</HStack>

			{gameCount > 0 ? (
				<Stack direction={{ base: 'column', sm: 'row' }} gap={3}>
					<Button onClick={onConfirm}>{`Check ${games}`}</Button>
					<LinkButton asChild variant="outline">
						<NextLink href="/start">Not my profile</NextLink>
					</LinkButton>
				</Stack>
			) : (
				<>
					<PrivacyHelp visible={profile.visible} />
					<Stack direction={{ base: 'column', sm: 'row' }} gap={3}>
						<LinkButton asChild>
							<NextLink
								href={`/start?steamid=${encodeURIComponent(profile.steamID)}`}
							>
								Start over
							</NextLink>
						</LinkButton>
						<LinkButton asChild variant="outline">
							<NextLink href="/start">Not my profile</NextLink>
						</LinkButton>
					</Stack>
				</>
			)}
		</Stack>
	);
}
