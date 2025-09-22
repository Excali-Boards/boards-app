import { AllowedPlatforms, allowedPlatforms } from '~/utils/config.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { parseUserAgent } from '~/utils/session.server';
import { authenticator } from '~/utils/auth.server';
import { loginInfo } from '~/utils/storage.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { type } = params as { type: AllowedPlatforms; };
	if (!type || !allowedPlatforms.some((p) => p.toLowerCase() === type.toLowerCase())) return redirect('/login');

	const cookieHeader = request.headers.get('Cookie');
	const backToCookie = await loginInfo.parse(cookieHeader) || {};

	const backTo = backToCookie?.backTo || '/';
	if (backTo) backToCookie.backTo = undefined;

	const check = await authenticator.isAuthenticated(request);
	if (check) return redirect(backTo);

	const addToUser = 'currentUserId' in backToCookie ? backToCookie.currentUserId : undefined;
	if (addToUser) backToCookie.currentUserId = undefined;

	try {
		return await authenticator.authenticate(type, request, {
			successRedirect: backTo,
			failureRedirect: '/login',
			context: {
				currentUserId: addToUser,
				device: parseUserAgent(request.headers.get('user-agent')),
				ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || undefined,
			},
		});
	} catch (error) { // This is really ingenious way.
		if (error instanceof Response && !error.redirected) {
			error.headers.append('Set-Cookie', await loginInfo.serialize(backToCookie));
		}

		if (error instanceof Error && error.name === 'CustomError') {
			return redirect(`/err?code=${error.message}`, { headers: { 'Set-Cookie': await loginInfo.serialize(backToCookie) } });
		}

		throw error;
	}
};

export default function Callback() {
	return <div>Redirecting..</div>;
}
