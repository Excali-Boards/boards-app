import { ActionFunctionArgs, json, redirect } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { getIpHeaders, makeResObject } from '~/utils/functions.server';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { code } = validateParams(params, ['code']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) {
		const inviteUrl = new URL(request.url);
		inviteUrl.pathname = inviteUrl.pathname.replace(/\/accept$/, '');
		inviteUrl.search = '';
		return redirect(`/login?backTo=${encodeURIComponent(inviteUrl.toString())}`);
	}

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) return json(makeResObject(null, 'Failed to get client IP.'));

	const result = await api?.invites.useInvite({ auth: token, code, headers: ipHeaders });
	if (!result || 'error' in result) return json(makeResObject(result, 'Failed to accept invite.'));

	return json(makeResObject(result, 'Successfully accepted invite.'));
};

export default function AcceptInviteAction() {
	return null;
}
