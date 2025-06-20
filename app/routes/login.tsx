import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Container } from '~/components/layout/Container';
import { allowedPlatforms } from '~/utils/config.server';
import { getCachedUser } from '~/utils/session.server';
import { platformButtons } from '~/other/platforms';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { loginInfo } from '~/utils/storage.server';
import { LinkButton } from '~/components/Button';
import { Box, VStack } from '@chakra-ui/react';
import { useContext, useMemo } from 'react';

export async function loader({ request }: LoaderFunctionArgs) {
	const query = new URLSearchParams(request.url.split('?')[1]);

	const token = await authenticator.isAuthenticated(request);
	const DBUser = await getCachedUser(request);

	const type = query.get('type') as string | undefined;
	if (!type || !allowedPlatforms.some((p) => p.toLowerCase() === type.toLowerCase())) {
		if (token) return redirect('/');
		else return { data: null };
	}

	const backTo = query.get('backTo') || '/';
	if (token && DBUser && 'data' in DBUser && type === DBUser.data.mainLoginType.toLowerCase()) return redirect(backTo || '/');

	const cookieHeader = request.headers.get('Cookie');
	const backToCookie = await loginInfo.parse(cookieHeader) || {};
	backToCookie.backTo = backTo;

	if (query.get('add') === 'true' && DBUser && 'data' in DBUser) {
		backToCookie.currentUserId = DBUser.data.id;
		return await authenticator.logout(request, {
			redirectTo: `/login?type=${type}&add=true&backTo=${backTo}`,
			headers: { 'Set-Cookie': await loginInfo.serialize(backToCookie) },
		});
	}

	try {
		return await authenticator.authenticate(type, request, {
			successRedirect: backTo,
			failureRedirect: '/',
			context: backToCookie.currentUserId ? {
				currentUserId: backToCookie.currentUserId,
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

export default function Login() {
	const { allowedPlatforms = [] } = useContext(RootContext) || {};
	const allButtons = useMemo(() => platformButtons(allowedPlatforms), [allowedPlatforms]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 40 }} id='a1'>
			<Box maxWidth='500px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<Container gap={2} bg='transparent' p={0}>
					{allButtons.length ? allButtons.map((platform) => (
						<LinkButton
							to={`/login?type=${platform.name.toLowerCase()}`}
							id={`login-button-${platform.name}`}
							rounded={12}
							key={platform.name}
							bgColor={platform.color}
							leftIcon={platform.icon({ boxSize: 6 })}
							justifyContent='flex-start'
							variant='solid'
							pl={'30%'}
							size='lg'
							w='100%'
						>
							Continue with {platform.name}
						</LinkButton>
					)) : (
						<Box>
							No platforms enabled.
						</Box>
					)}
				</Container>
			</Box>
		</VStack>
	);
}
