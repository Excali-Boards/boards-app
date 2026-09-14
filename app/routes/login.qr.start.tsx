import { getIpHeaders, rejectCrossSiteRequest } from '~/utils/functions.server';
import { describeUserAgent } from '~/utils/session.server';
import { ActionFunctionArgs, json } from '@remix-run/node';
import { qrDeviceCookie } from '~/utils/storage.server';
import { authenticator } from '~/utils/auth.server';
import { getSafeBackTo } from '~/other/qr-login';
import config from '~/utils/config.server';
import { api } from '~/utils/web.server';

export const action = async ({ request }: ActionFunctionArgs) => {
	const csrfError = rejectCrossSiteRequest(request);
	if (csrfError) return csrfError;
	if (await authenticator.isAuthenticated(request)) return json({ error: 'You are already signed in.' }, { status: 400 });

	const formData = await request.formData();
	const rawBackTo = formData.get('backTo');
	const backTo = getSafeBackTo(typeof rawBackTo === 'string' ? rawBackTo : null);
	const headers = getIpHeaders(request) || undefined;

	if (!api) return unavailable();

	const result = await api.sessions.createQrLoginChallenge({
		auth: config.apiToken,
		body: { requestDevice: describeUserAgent(request.headers.get('user-agent')) },
		headers,
	});

	if ('error' in result) return unavailable();

	const origin = config.baseUrl || new URL(request.url).origin;
	const approvalUrl = new URL('/login/qr/approve', origin);
	approvalUrl.searchParams.set('code', result.data.userCode);

	return json({
		data: {
			userCode: result.data.userCode,
			approvalUrl: approvalUrl.toString(),
			expiresAt: result.data.expiresAt,
			requestDevice: result.data.requestDevice,
			backTo,
		},
	}, {
		headers: {
			'Cache-Control': 'no-store',
			'Set-Cookie': await qrDeviceCookie.serialize(result.data.deviceCode),
		},
	});
};

function unavailable() {
	return json({ error: 'QR login is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
