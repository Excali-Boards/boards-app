import { AllowedPlatforms, allowedPlatforms } from '~/utils/config.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { loginInfo } from '~/utils/storage.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	const { type } = params as { type: AllowedPlatforms; };
	if (!type || !allowedPlatforms.some((p) => p.toLowerCase() === type.toLowerCase())) return redirect('/login');

	const cookieHeader = request.headers.get('Cookie');
	const backToCookie = await loginInfo.parse(cookieHeader) || {};

	const backTo = backToCookie?.backTo || '/';
	if (backTo) backToCookie.backTo = undefined;

	const check = await authenticator.isAuthenticated(request);
	if (check) return redirect(backTo);

	const addToUser = backToCookie.currentUserId;
	if (addToUser) backToCookie.currentUserId = undefined;

	try {
		return await authenticator.authenticate(type, request, {
			successRedirect: backTo,
			failureRedirect: '/login',
			context: addToUser ? {
				currentUserId: addToUser,
			} : undefined,
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
}

export default function Callback() {
	return <div>Redirecting..</div>;
}
