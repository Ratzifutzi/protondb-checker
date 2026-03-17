import { logger } from '@/lib/logger';
import CachedProtonGame from '@/models/CachedProtonGame';
import ScanLog from '@/models/ScanLog';
import { getClientIp } from 'next-request-ip';
import { NextRequest } from 'next/server';

const millisecondsInDay: number = 1000 * 60 * 60 * 24;

export async function POST(req: NextRequest) {
	let appId: number;
	const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);

	try {
		const body = await req.json();
		appId = Number(body?.appId);
	} catch {
		return new Response('Invalid JSON body', { status: 400 });
	}

	if (!Number.isInteger(appId) || appId <= 0) {
		return new Response('Missing or invalid appId', { status: 400 });
	}

	// Check if the IP requested a profile recently, if not, reject response
	const ipRateLimitDocument = await ScanLog.find({
		ipAddress: getClientIp(req.headers),
		date: {$gte: sixtyMinutesAgo}
	})
	if (ipRateLimitDocument.length == 0) {
		console.log("IP didnt request a profile recently.");
		return new Response(getClientIp(req.headers), { status: 403 });
	}

	// Check if already stored in database
	const doc = await CachedProtonGame.findOne({appId: appId})
	if(doc !== null) {
		const creationDate: Date = doc.savedAt;
		const currentDate: Date = new Date();

		const diff: number = Math.abs(currentDate.getTime() - creationDate.getTime())
		const differenceInDays: number = Math.floor(diff / millisecondsInDay);

		if(differenceInDays < 30) {
			// Fresh cache, send the document from DB
			return Response.json(doc.data);
		}

		// Old cache, delete document and ask proton DB again
		await CachedProtonGame.findOneAndDelete({appId: appId})
		console.log("Asking protondb for, cache was too old:", appId);
	}

	try {
		const protonDbResponse = await fetch(
			`https://www.protondb.com/api/v1/reports/summaries/${appId}.json`
		);

		if (!protonDbResponse.ok) {
			return new Response('Failed to fetch ProtonDB summary', {
				status: protonDbResponse.status,
			});
		}

		const data = await protonDbResponse.json();
		data["id"] = appId;

		// Save in mongodb
		try {
			const cachedProtonGame = new CachedProtonGame({
				appId: appId,
				savedAt: new Date(),
				data: data
			})
			await cachedProtonGame.save();
		} catch (err) {
			logger.error("Could not save game document in DB.", err)
		}
		
		return Response.json(data);
	} catch (error) {
		console.error('Error fetching ProtonDB summary:', appId, error);
		return new Response('Error fetching ProtonDB summary', { status: 500 });
	}
}