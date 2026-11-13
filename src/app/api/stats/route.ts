import { logger } from '@/lib/logger';
import CachedProtonGame from '@/models/CachedProtonGame';
import ScanLog from '@/models/ScanLog';
import { NextResponse } from 'next/server';

export type StatsCache = {
	age: Date;
	lastMonth: number;
	total: number;
	totalGames: number;
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CachedResults: StatsCache = {
	age: new Date(0),
	lastMonth: -1,
	total: -1,
	totalGames: -1,
};

export async function GET() {
	const now = Date.now();
	const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

	const shouldRefresh = now - CachedResults.age.getTime() > CACHE_DURATION_MS;
	if (shouldRefresh) {
		logger.info('Refreshing cache...');

		// Count on the server instead of loading every log document.
		const [total, lastMonth, totalGamesCount] = await Promise.all([
			ScanLog.estimatedDocumentCount().exec(),
			ScanLog.countDocuments({ date: { $gte: thirtyDaysAgo } }).exec(),
			CachedProtonGame.countDocuments().exec(),
		]);

		CachedResults.age = new Date(Date.now());
		CachedResults.total = total;
		CachedResults.lastMonth = lastMonth;
		CachedResults.totalGames = totalGamesCount;
	}

	return NextResponse.json(CachedResults);
}
