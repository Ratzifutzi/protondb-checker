import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
	let appId: number;

	try {
		const body = await req.json();
		appId = Number(body?.appId);
	} catch {
		return new Response('Invalid JSON body', { status: 400 });
	}

	if (!Number.isInteger(appId) || appId <= 0) {
		return new Response('Missing or invalid appId', { status: 400 });
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
		
		return Response.json(data);
	} catch (error) {
		console.error('Error fetching ProtonDB summary:', appId, error);
		return new Response('Error fetching ProtonDB summary', { status: 500 });
	}
}