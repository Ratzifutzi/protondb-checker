import { logger } from '@/lib/logger';
import { openIdSteam } from '@/lib/openIdSteam';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	const redirectUrl = await openIdSteam.getRedirectUrl();
	logger.info(redirectUrl);
	return NextResponse.redirect(redirectUrl);
}
