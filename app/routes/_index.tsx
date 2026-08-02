import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return redirect('/login');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBGroups = await api?.groups.getGroups({ auth: token, headers: ipHeaders });
	if (!DBGroups || 'error' in DBGroups) throw makeResponse(DBGroups, 'Failed to get groups.');

	const groups = Array.isArray(DBGroups.data) ? DBGroups.data : [];
	const defaultGroup = groups.find((group) => group.isDefault);
	if (!defaultGroup) return redirect('/groups');

	return redirect(`/groups/${defaultGroup.id}`);
};

export default function Index() {
	return <div>Preusmjeravanje..</div>;
}
