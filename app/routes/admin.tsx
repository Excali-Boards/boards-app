import { makeResponse } from '~/utils/functions.server';
import { getCachedUser } from '~/utils/session.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { Outlet } from '@remix-run/react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	const DBUser = await getCachedUser(request);

	if (!DBUser || !token || 'error' in DBUser) throw makeResponse(DBUser, 'You are not authorized to view this page.');
	else if (!DBUser.data.isDev) throw makeResponse(null, 'You are not authorized to view this page.');

	return { authorized: true };
};

export default function Admin() {
	return <Outlet />;
}
