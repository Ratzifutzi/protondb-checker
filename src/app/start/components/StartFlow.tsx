'use client';

import PublicProfileNotice from '@/components/partials/publicProfileNotice';
import { toaster } from '@/components/ui/toaster';
import { Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import LinkAccount from './LinkAccount';
import ManualInput from './ManualInput';

type StartFlowProps = {
	/** SteamID from the address. The form submits it on its own. */
	initialSteamId?: string;
	/** True when Steam sign-in sent the user back with an error. */
	steamSignInFailed: boolean;
};

export default function StartFlow({
	initialSteamId,
	steamSignInFailed,
}: StartFlowProps) {
	const searchParams = useSearchParams();
	// Going back to this page can show it again from the router cache, with
	// the props of the first visit, while the address no longer has the query
	// (it is removed below). Only use the props while the address still has
	// them, so going back does not start the same check again.
	const [prefill] = useState(() =>
		searchParams.has('steamid') ? initialSteamId : undefined,
	);
	const [signInFailed] = useState(
		() => steamSignInFailed && searchParams.has('error'),
	);

	// StrictMode runs mount effects twice in development.
	const handledRef = useRef(false);
	useEffect(() => {
		if (handledRef.current) return;
		handledRef.current = true;

		if (signInFailed) {
			toaster.error({
				title: 'Steam sign-in failed',
				description:
					'Steam could not confirm your account. Try again or enter your SteamID.',
				closable: true,
				duration: 30_000,
			});
		}

		if (window.location.search) {
			// Next.js hooks into history.replaceState from an effect of its root
			// router, and on a full page load that effect runs after this one.
			// Waiting one task lets the call go through Next.js, which keeps its
			// own history state. Without that state the back button could not
			// return to this page.
			window.setTimeout(() => {
				if (window.location.pathname === '/start' && window.location.search) {
					window.history.replaceState(null, '', '/start');
				}
			}, 0);
		}
	}, [signInFailed]);

	return (
		<Stack gap={5}>
			<Heading as="h1" size="2xl">
				Find your Steam profile
			</Heading>
			<PublicProfileNotice />
			{prefill && (
				<Text textStyle="sm" color="fg.muted">
					Your SteamID is filled in. Your profile loads as soon as the captcha
					is done.
				</Text>
			)}
			<ManualInput initialSteamId={prefill} />
			<HStack gap={3}>
				<Separator flex="1" aria-hidden />
				<Text textStyle="sm" color="fg.muted" flexShrink={0}>
					or
				</Text>
				<Separator flex="1" aria-hidden />
			</HStack>
			{/* Outside the form, so focusing it does not start the captcha. */}
			<LinkAccount />
		</Stack>
	);
}
