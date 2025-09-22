import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { makeResponse } from '~/utils/functions.server';
import { authenticator } from '~/utils/auth.server';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return redirect('/login');

	const DBGroups = await api?.groups.getGroups({ auth: token });
	if (!DBGroups || 'error' in DBGroups) throw makeResponse(DBGroups, 'Failed to get groups.');

	const defaultGroup = DBGroups.data.find((group) => group.isDefault);
	if (!defaultGroup) return redirect('/groups');

	return redirect(`/groups/${defaultGroup.id}`);
};

export default function Index() {
	return <div>Preusmjeravanje..</div>;
}
