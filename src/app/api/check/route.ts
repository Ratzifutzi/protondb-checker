import { CaptchaClient } from '@/lib/captcha';
import { steam } from '@/lib/steamApi';
import { PageConfig } from 'next';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
	const body = await req.json();

	const captchaSolution = body.captchaSolution;
	let steamid = body.steamid;

	let games = {};
	let profile = {};

	// Verify fields
	if (!steamid) {
		return new Response('Missing steamid parameter', { status: 400 });
	}
	if (!captchaSolution) {
		return new Response('Missing captchaSolution parameter', { status: 400 });
	}

	// Verify captcha solution
	try {
		const captchaResult = await CaptchaClient.verify({
			solution: captchaSolution,
		});

		if (!captchaResult.ok()) {
			return new Response('Captcha verification failed', { status: 400 });
		}
	} catch (error) {
		console.error('Error verifying captcha:', error);
		return new Response('Error verifying captcha', { status: 500 });
	}

	// check if steamid is a valid 64-bit SteamID, if not, try to resolve it
	if (!/^\d{17}$/.test(steamid)) {
		try {
			const resolvedSteamID = await steam.resolve(`${steamid}`);
			if (resolvedSteamID) {
				console.log(`Resolved SteamID for ${steamid}: ${resolvedSteamID}`);

				steamid = resolvedSteamID;
			} else {
				return new Response('Invalid SteamID or vanity URL', { status: 400 });
			}
		} catch {
			return new Response('Error resolving SteamID', { status: 404 });
		}
	}

		// Fetch profile
	try {
		const res = await steam.getUserSummary(steamid);
		profile = res;
	} catch (error) {
		console.error('Error fetching user profile:', steamid, error);
		return new Response('Error fetching user profile', { status: 404 });
	}

	// Fetch games
	try {
		const res = await steam.getUserOwnedGames(steamid, {
			includeAppInfo: true,
			includeFreeGames: true,
		});
		games = res;
	} catch (error) {
		console.error('Error fetching user games:', steamid, error);
		return new Response('Error fetching user games', { status: 500 });
	}

	// Return
	return Response.json({
		games: games,
		profile: profile,
	});
}

export const config: PageConfig = {
	api: {
		bodyParser: {},
	},
};
