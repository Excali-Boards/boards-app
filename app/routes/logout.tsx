import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const backTo = new URLSearchParams(request.url.split('?')[1]).get('backTo');
	return await authenticator.logout(request, { redirectTo: backTo || '' });
};

export default function Logout() {
	return <div>Redirecting..</div>;
}
