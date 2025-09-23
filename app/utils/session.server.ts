import { Device } from '@excali-boards/boards-api-client/prisma/generated/client';
import { GetUsersOutput, WebResponse } from '@excali-boards/boards-api-client';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';
import { UAParser } from 'ua-parser-js';

export type UserResponse = WebResponse<GetUsersOutput> | undefined;
const userCache = new Map<string, { data: UserResponse; expiry: number }>();

const userAgentParser = new UAParser('user-agent');

export async function getCachedUser(request: Request): Promise<UserResponse> {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return;

	const now = Date.now();
	const cached = userCache.get(token);

	if (cached && cached.expiry > now) return cached.data;
	if (cached) userCache.delete(token);

	const result = await api?.users.getCurrentUser({ auth: token });

	userCache.set(token, {
		data: result,
		expiry: now + 5 * 60 * 1000,
	});

	return result;
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
