import CardFooter from '@/components/partials/footer';
import PageShell from '@/components/partials/pageShell';
import SyncSteps from '@/components/partials/syncSteps';
import { Card } from '@chakra-ui/react';
import type { Metadata } from 'next';
import StartFlow from './components/StartFlow';

export const metadata: Metadata = {
	title: 'Find your Steam profile',
};

/** Longest SteamID value taken from the address. Profile links are short. */
const MAX_STEAM_ID_LENGTH = 200;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

/**
 * Step 1 of a check. `?steamid=` fills in the form and submits it on its own
 * (Steam sign-in, "Check again", an expired session on /fetch). `?error=` is
 * set when Steam sign-in failed.
 */
export default async function StartPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const params = await searchParams;
	const steamId =
		firstValue(params.steamid)?.trim().slice(0, MAX_STEAM_ID_LENGTH) ||
		undefined;
	const steamSignInFailed = firstValue(params.error) !== undefined;

	return (
		<PageShell>
			<Card.Body gap={6}>
				<SyncSteps currentStep={0} />
				<StartFlow
					initialSteamId={steamId}
					steamSignInFailed={steamSignInFailed}
				/>
			</Card.Body>
			<CardFooter />
		</PageShell>
	);
}
