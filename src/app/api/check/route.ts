import { CaptchaClient } from '@/lib/captcha';
import { steam } from '@/lib/steamApi';
import ScanLog from '@/models/ScanLog';
import { PageConfig } from 'next';
import { getClientIp } from 'next-request-ip';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
	const body = await req.json();

	const captchaSolution = body.captchaSolution;
	let steamid = body.steamid;
	const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);

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

	// Verify if IP ratelimits are met
	// 15 users / IP / 60 minutes allowed
	const ipRateLimitDocument = await ScanLog.find({
		ipAddress: getClientIp(req.headers),
		date: {$gte: sixtyMinutesAgo}
	})
	if (ipRateLimitDocument.length >= 15) {
		console.log("IP is ratelimited");
		return new Response(getClientIp(req.headers), { status: 429 });
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

	// Verify if profile ratelimits are met
	// 5 profile requests / 60 minutes allowed
	const profileRateLimitDocument = await ScanLog.find({
		targetProfile: steamid,
		date: {$gte: sixtyMinutesAgo}
	})
	if (profileRateLimitDocument.length >= 5) {
		console.log("Profile is ratelimited");
		return new Response('Profile', { status: 429 });
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

	// Log in databse
	const logEvent = new ScanLog({
		date: new Date(),
		ipAddress: getClientIp(req.headers),
		targetProfile: steamid,
	})
	await logEvent.save();

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
