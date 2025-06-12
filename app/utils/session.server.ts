import { GetUsersOutput, WebResponse } from '@excali-boards/boards-api-client';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';

const userCache = new WeakMap<Request, WebResponse<GetUsersOutput> | null>();

export async function getCachedUser(request: Request) {
	if (userCache.has(request)) return userCache.get(request) || null;

	const token = await authenticator.isAuthenticated(request);
	if (!token) return null;

	const result = await api?.users.getCurrentUser({ auth: token });
	userCache.set(request, result || null);
	return result;
}
