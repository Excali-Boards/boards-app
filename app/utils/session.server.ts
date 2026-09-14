import { Device } from '@excali-boards/boards-api-client/prisma/generated/client';
import { GetUsersOutput, WebResponse } from '@excali-boards/boards-api-client';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';
import { UAParser } from 'ua-parser-js';

export type UserResponse = WebResponse<GetUsersOutput & { personalBoardsEnabled?: boolean }>;
const userCache = new Map<string, { data: UserResponse; expiry: number }>();
const maxUserCacheEntries = 1000;

export type CachedResponse = {
	data: UserResponse;
	token: string;
} | undefined;

export async function getCachedUser(request: Request): Promise<CachedResponse> {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return;

	const now = Date.now();
	const cached = userCache.get(token);

	if (cached && cached.expiry > now) return { data: cached.data, token };
	if (cached) userCache.delete(token);

	const result = await api?.users.getUser({ auth: token });
	if (!result) return;
	pruneUserCache(now);

	userCache.set(token, {
		data: result,
		expiry: now + 5 * 60 * 1000,
	});

	return { data: result, token };
}

export async function clearUserCache(requestOrToken: Request | string): Promise<void> {
	const token = typeof requestOrToken === 'string' ? requestOrToken : await authenticator.isAuthenticated(requestOrToken);
	if (!token) return;

	userCache.delete(token);
}

export function parseUserAgent(uaString: string | null): Device {
	if (!uaString) return 'Other';

	const ua = new UAParser(uaString).getDevice();

	switch (ua.type) {
		case 'mobile': return 'Mobile';
		case 'tablet': return 'Tablet';
		case 'desktop':
		case undefined: return 'Desktop';
		default: return 'Other';
	}
}

export function describeUserAgent(uaString: string | null): string {
	if (!uaString) return 'Unknown browser · Desktop';

	const result = new UAParser(uaString).getResult();
	const browser = result.browser.name || 'Unknown browser';
	const operatingSystem = result.os.name || 'Unknown operating system';
	const device = result.device.type === 'mobile' ? 'Mobile' : result.device.type === 'tablet' ? 'Tablet' : 'Desktop';
	return `${browser} on ${operatingSystem} · ${device}`.slice(0, 120);
}

function pruneUserCache(now: number): void {
	if (userCache.size < maxUserCacheEntries) return;

	for (const [token, cached] of userCache) {
		if (cached.expiry <= now) userCache.delete(token);
	}

	while (userCache.size >= maxUserCacheEntries) {
		const oldestToken = userCache.keys().next().value;
		if (!oldestToken) break;
		userCache.delete(oldestToken);
	}
}
