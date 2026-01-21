import { Device } from '@excali-boards/boards-api-client/prisma/generated/client';
import { GetUsersOutput, WebResponse } from '@excali-boards/boards-api-client';
import { authenticator } from '~/utils/auth.server';
import { getIpHeaders } from './functions.server';
import { CustomError } from './logger.server';
import { api } from '~/utils/web.server';
import { UAParser } from 'ua-parser-js';

export type UserResponse = WebResponse<GetUsersOutput>;
const userCache = new Map<string, { data: UserResponse; expiry: number }>();

const userAgentParser = new UAParser('user-agent');

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

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw new CustomError('Failed to get client IP.', 'CustomError');

	const result = await api?.users.getUser({ auth: token });
	if (!result) return;

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

	const ua = userAgentParser.setUA(uaString).getDevice();

	switch (ua.type) {
		case 'desktop': return 'Desktop';
		case 'mobile': return 'Mobile';
		case 'tablet': return 'Tablet';
		default: return 'Other';
	}
}
