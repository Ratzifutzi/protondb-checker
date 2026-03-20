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
	const foreverAgo = new Date(0);

	const shouldRefresh = now - CachedResults.age.getTime() > CACHE_DURATION_MS;
	if (shouldRefresh) {
		logger.info('Refreshing cache...');

		let total = 0;
		let lastMonth = 0;

		const totalDocuments = await ScanLog.find({
			date: { $gte: foreverAgo },
		});
		total = totalDocuments.length;

		const lastMonthDocuments = await ScanLog.find({
			date: { $gte: thirtyDaysAgo },
		});
		lastMonth = lastMonthDocuments.length;

		const totalGamesCount = await CachedProtonGame.countDocuments();

		CachedResults.age = new Date(Date.now());
		CachedResults.total = total;
		CachedResults.lastMonth = lastMonth;
		CachedResults.totalGames = totalGamesCount;
	}

	return NextResponse.json(CachedResults);
}
