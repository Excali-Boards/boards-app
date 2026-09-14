import { getIpHeaders, rejectCrossSiteRequest } from '~/utils/functions.server';
import { qrDeviceCookie, sessionStorage } from '~/utils/storage.server';
import { ActionFunctionArgs, json } from '@remix-run/node';
import { parseUserAgent } from '~/utils/session.server';
import { authenticator } from '~/utils/auth.server';
import config from '~/utils/config.server';
import { api } from '~/utils/web.server';

export const action = async ({ request }: ActionFunctionArgs) => {
	const csrfError = rejectCrossSiteRequest(request);
	if (csrfError) return csrfError;
	if (await authenticator.isAuthenticated(request)) return json({ status: 'approved' as const }, { headers: { 'Cache-Control': 'no-store' } });

	const deviceCode = await qrDeviceCookie.parse(request.headers.get('Cookie'));
	if (!deviceCode) return json({ status: 'expired' as const }, { headers: { 'Cache-Control': 'no-store' } });
	if (!api) return unavailable();

	const result = await api.sessions.redeemQrLogin({
		auth: config.apiToken,
		body: {
			deviceCode,
			device: parseUserAgent(request.headers.get('user-agent')),
		},
		headers: getIpHeaders(request) || undefined,
	}).catch(() => null);

	if (!result) return unavailable();
	if ('error' in result) {
		const status = result.status === 429 ? 429 : 503;
		return json({ error: 'QR login is temporarily unavailable.' }, { status, headers: { 'Cache-Control': 'no-store' } });
	}

	if (result.data.status !== 'approved') {
		return json({ status: result.data.status }, { headers: { 'Cache-Control': 'no-store' } });
	}

	const session = await sessionStorage.getSession(request.headers.get('Cookie'));
	session.set(authenticator.sessionKey, result.data.token);
	const secondsRemaining = Math.max(1, Math.floor((new Date(result.data.expiresAt).getTime() - Date.now()) / 1000));
	const headers = new Headers({ 'Cache-Control': 'no-store' });

	headers.append('Set-Cookie', await sessionStorage.commitSession(session, { maxAge: secondsRemaining }));
	headers.append('Set-Cookie', await qrDeviceCookie.serialize('', { maxAge: 0 }));

	return json({ status: 'approved' as const }, { headers });
};

function unavailable() {
	return json({ error: 'QR login is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
