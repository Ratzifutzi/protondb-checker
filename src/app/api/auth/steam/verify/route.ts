import { logger } from '@/lib/logger';
import { openIdSteam } from '@/lib/openIdSteam';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	try {
		const user = await openIdSteam.authenticate(req);

		return NextResponse.redirect(
			`${process.env.HOSTED_DOMAIN}/start?steamid=${encodeURIComponent(user.steamid)}`,
		);
	} catch (error) {
		logger.error('Could not verify steam profile.', error);
		return NextResponse.redirect(`${process.env.HOSTED_DOMAIN}/start?error=1`);
	}
}
