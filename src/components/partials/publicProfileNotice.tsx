import { Alert, Link, VisuallyHidden } from '@chakra-ui/react';

const PRIVACY_SETTINGS_URL = 'https://steamcommunity.com/my/edit/settings';

/** Reminds the user that Steam only shares the games of public profiles. */
export default function PublicProfileNotice() {
	return (
		<Alert.Root status="warning">
			<Alert.Indicator aria-hidden />
			<Alert.Content>
				<Alert.Title>Your game details need to be public</Alert.Title>
				<Alert.Description>
					Steam only shares the games of public profiles. You can change this in
					your{' '}
					<Link
						href={PRIVACY_SETTINGS_URL}
						target="_blank"
						rel="noopener noreferrer"
						variant="underline"
						// Inline, so the link wraps with the sentence on narrow screens.
						display="inline"
						fontWeight="medium"
						textDecorationColor="currentColor"
					>
						Steam privacy settings
						<VisuallyHidden> (opens in a new tab)</VisuallyHidden>
					</Link>
					.
				</Alert.Description>
			</Alert.Content>
		</Alert.Root>
	);
}
