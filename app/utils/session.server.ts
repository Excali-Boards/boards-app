import { GetUsersOutput, WebResponse } from '@excali-boards/boards-api-client';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';

export type UserResponse = WebResponse<GetUsersOutput> | undefined;
const userCache = new WeakMap<Request, UserResponse>();

export async function getCachedUser(request: Request): Promise<UserResponse> {
	if (userCache.has(request)) return userCache.get(request);

	const token = await authenticator.isAuthenticated(request);
	if (!token) return;

	const result = await api?.users.getCurrentUser({ auth: token });
	userCache.set(request, result);
	return result;
}
