import { getCachedUser, parseUserAgent } from '~/utils/session.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { allowedPlatforms } from '~/utils/config.server';
import { authenticator } from '~/utils/auth.server';
import { loginInfo } from '~/utils/storage.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const type = params.type?.toLowerCase();
	const backTo = new URL(request.url).searchParams.get('backTo') || '/profile';

	if (!type || !allowedPlatforms.some((p) => p.toLowerCase() === type)) {
		return redirect(backTo);
	}

	const token = await authenticator.isAuthenticated(request);
	const DBUser = (await getCachedUser(request))?.data;

	if (!token || !DBUser || !('data' in DBUser)) {
		return redirect(`/login?backTo=${encodeURIComponent(backTo)}`);
	}

	const cookieHeader = request.headers.get('Cookie');
	const backToCookie = await loginInfo.parse(cookieHeader) || {};
	backToCookie.backTo = backTo;

	try {
		return await authenticator.authenticate(type, request, {
			successRedirect: backTo,
			failureRedirect: backTo,
			context: {
				currentUserId: DBUser.data.userId,
				device: parseUserAgent(request.headers.get('user-agent')),
				ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || undefined,
			},
		});
	} catch (error) {
		if (error instanceof Response && !error.redirected) {
			error.headers.append('Set-Cookie', await loginInfo.serialize(backToCookie));
		}

		if (error instanceof Error && error.name === 'CustomError') {
			return redirect(`/err?code=${error.message}`, { headers: { 'Set-Cookie': await loginInfo.serialize(backToCookie) } });
		}

		throw error;
	}
};

export default function LinkRoute() {
	return <div>Redirecting..</div>;
}
