import { logger } from '@/lib/logger';
import { resolveSummaries } from '@/lib/protonLookup';
import ScanLog from '@/models/ScanLog';
import { BULK_LIMITS } from '@/types/proton';
import { getClientIp } from 'next-request-ip';
import type { NextRequest } from 'next/server';

/** No new ProtonDB call starts after this. Calls end about 3 s later. */
const BUDGET_MS = 5000;
/** A lookup needs a profile check from the same IP within this window. */
const SESSION_WINDOW_MS = 60 * 60 * 1000;
const MAX_APP_ID = 2147483647;
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * IPs with a lookup in flight. One request per visitor at a time keeps
 * ProtonDB at 4 calls per visitor. Per process, so with several workers it
 * is only approximate.
 */
const busyIps = new Set<string>();

type Checked<T> = { ok: true; value: T } | { ok: false; response: Response };

type BulkInput = { appIds: number[]; cacheOnly: boolean };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAppId(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 1 &&
		value <= MAX_APP_ID
	);
}

function text(body: string, status: number): Response {
	return new Response(body, {
		status,
		headers: { ...NO_STORE, 'Content-Type': 'text/plain; charset=utf-8' },
	});
}

function reject(message: string, status: number): Checked<never> {
	return { ok: false, response: text(message, status) };
}

/** Reads the body as text. Returns null once it grows past `maxBytes`. */
async function readBodyText(
	req: NextRequest,
	maxBytes: number,
): Promise<string | null> {
	if (!req.body) return '';
	const reader = req.body.getReader();
	const decoder = new TextDecoder();
	let size = 0;
	let body = '';
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return body + decoder.decode();
		size += value.byteLength;
		if (size > maxBytes) {
			await reader.cancel().catch(() => undefined);
			return null;
		}
		body += decoder.decode(value, { stream: true });
	}
}

async function readJson(req: NextRequest): Promise<Checked<unknown>> {
	const tooLarge = 'Request body is too large';
	const declared = Number(req.headers.get('content-length'));
	if (declared > BULK_LIMITS.maxBodyBytes) return reject(tooLarge, 413);

	const body = await readBodyText(req, BULK_LIMITS.maxBodyBytes);
	if (body === null) return reject(tooLarge, 413);
	try {
		return { ok: true, value: JSON.parse(body) };
	} catch {
		return reject('Invalid JSON body', 400);
	}
}

function parseBulkInput(body: unknown): Checked<BulkInput> {
	if (!isRecord(body)) return reject('Body must be a JSON object', 400);
	const { appIds, cacheOnly } = body;
	if (!Array.isArray(appIds)) return reject('appIds must be an array', 400);
	if (appIds.length === 0) return reject('appIds must not be empty', 400);
	if (appIds.length > BULK_LIMITS.maxIds) {
		const message = `appIds must not have more than ${BULK_LIMITS.maxIds} entries`;
		return reject(message, 400);
	}
	if (!appIds.every(isAppId)) {
		const message = `appIds must be integers from 1 to ${MAX_APP_ID}`;
		return reject(message, 400);
	}
	if (cacheOnly !== undefined && typeof cacheOnly !== 'boolean') {
		return reject('cacheOnly must be true or false', 400);
	}
	const ids: number[] = [...new Set(appIds)];
	return { ok: true, value: { appIds: ids, cacheOnly: cacheOnly === true } };
}

async function hasRecentScan(ip: string): Promise<boolean> {
	const since = new Date(Date.now() - SESSION_WINDOW_MS);
	const scan = await ScanLog.exists({ ipAddress: ip, date: { $gte: since } });
	return scan !== null;
}

function busyResponse(): Response {
	return Response.json(
		{ retryAfterMs: 1000 },
		{ status: 429, headers: { ...NO_STORE, 'Retry-After': '1' } },
	);
}

/**
 * Runs `work` only for IPs that checked a profile in the last hour, and only
 * one request per IP at a time.
 */
async function withSession(
	req: NextRequest,
	work: () => Promise<Response>,
): Promise<Response> {
	const ip = getClientIp(req.headers);
	if (!ip || !(await hasRecentScan(ip))) return text('Session expired', 403);
	if (busyIps.has(ip)) return busyResponse();

	busyIps.add(ip);
	try {
		return await work();
	} finally {
		busyIps.delete(ip);
	}
}

function isLegacyBody(body: unknown): body is { appId: unknown } {
	return isRecord(body) && 'appId' in body && !('appIds' in body);
}

/**
 * Old single game shape, for tabs opened before the bulk API existed.
 * 200 with the summary, 404 when there are no reports, 500 otherwise.
 * Remove a few weeks after the deploy.
 */
async function handleLegacy(
	req: NextRequest,
	body: { appId: unknown },
): Promise<Response> {
	const appId = Number(body.appId);
	if (!isAppId(appId)) return text('Missing or invalid appId', 400);

	return withSession(req, async () => {
		const result = await resolveSummaries([appId], {
			budgetMs: BUDGET_MS,
			signal: req.signal,
		});
		const [summary] = result.results;
		if (summary) return Response.json(summary, { headers: NO_STORE });
		if (result.noReports.length > 0) {
			return text('No reports for this game', 404);
		}
		return text('Could not get a summary from ProtonDB', 500);
	});
}

/**
 * Bulk ProtonDB lookup. Body: { appIds: number[], cacheOnly?: boolean }.
 * Answers with a BulkLookupResponse in which every requested id appears in
 * exactly one list.
 */
export async function POST(req: NextRequest): Promise<Response> {
	try {
		const body = await readJson(req);
		if (!body.ok) return body.response;
		if (isLegacyBody(body.value)) return await handleLegacy(req, body.value);

		const input = parseBulkInput(body.value);
		if (!input.ok) return input.response;

		return await withSession(req, async () => {
			const result = await resolveSummaries(input.value.appIds, {
				cacheOnly: input.value.cacheOnly,
				budgetMs: BUDGET_MS,
				signal: req.signal,
			});
			return Response.json(result, { headers: NO_STORE });
		});
	} catch (error) {
		logger.error('ProtonDB lookup request failed', error);
		return text('Internal server error', 500);
	}
}
