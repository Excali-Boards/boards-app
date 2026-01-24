import { makeResponse } from '~/utils/functions.server';
import { getCachedUser } from '~/utils/session.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { Outlet } from '@remix-run/react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBUser = (await getCachedUser(request))?.data;
	if (!DBUser || 'error' in DBUser) throw makeResponse(DBUser, 'Failed to get user data.');
	else if (!DBUser.data.isDev) throw makeResponse(null, 'You are not authorized to view this page.');

	return { authorized: true };
};

export default function Admin() {
	return <Outlet />;
}
