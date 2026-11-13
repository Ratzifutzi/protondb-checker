'use client';
// A client component because react-icons creates a React context.

import { Button, Stack, Text } from '@chakra-ui/react';
import { FaSteam } from 'react-icons/fa';

/**
 * Sign in with Steam. A plain link: the login route redirects to Steam, and
 * Steam sends the user back to /start with the SteamID filled in.
 */
export default function LinkAccount() {
	return (
		<Stack gap={2}>
			<Button
				asChild
				variant="outline"
				size="lg"
				w="full"
				// Button sets type="button", which is not valid on a link.
				type={undefined}
			>
				<a href="/api/auth/steam/login">
					<FaSteam aria-hidden />
					Sign in with Steam
				</a>
			</Button>
			<Text textStyle="sm" color="fg.muted">
				Steam only shares your public SteamID with this site. Your password
				stays with Steam.
			</Text>
		</Stack>
	);
}
