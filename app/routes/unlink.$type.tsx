import { allowedPlatforms, convertName, AllowedPlatforms } from '~/utils/config.server';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { clearUserCache } from '~/utils/session.server';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');
	if (!api) throw makeResponse(null, 'API client not initialized.');

	const type = params.type?.toLowerCase() as AllowedPlatforms | undefined;
	if (!type || !allowedPlatforms.includes(type)) throw makeResponse(null, 'Invalid platform.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const backTo = new URL(request.url).searchParams.get('backTo') || '/profile';
	const platform = convertName(type);

	const DBUser = await api.users.getUser({ auth: token, headers: ipHeaders });
	if (!DBUser || 'error' in DBUser) throw makeResponse(DBUser, 'Failed to get user data.');

	const canUnlink = DBUser.data.loginMethods.length > 1;
	if (!canUnlink) throw makeResponse(null, 'You must keep at least one login method.');
	else if (DBUser.data.mainLoginType === platform) throw makeResponse(null, 'Cannot unlink the main platform.');

	const result = await api.sessions.rotateLinkedSession({ body: { platform }, auth: token, headers: ipHeaders });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to unlink login method.');

	await clearUserCache(token);
	return redirect(backTo);
};

export default function UnlinkRoute() {
	return <div>Redirecting..</div>;
}
