import { Box, Button, Divider, Flex, Text, VStack, useColorMode } from '@chakra-ui/react';
import { oidcLoginButton, platformButtons, qrLoginButton } from '~/other/platforms';
import { Outlet, useLocation, useSearchParams } from '@remix-run/react';
import { getCachedUser, parseUserAgent } from '~/utils/session.server';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Container } from '~/components/layout/Container';
import { allowedPlatforms } from '~/utils/config.server';
import { useContext, useMemo, useState } from 'react';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { loginInfo } from '~/utils/storage.server';
import { LinkButton } from '~/components/Button';
import { getSafeBackTo } from '~/other/qr-login';
import { QrLogin } from '~/components/QrLogin';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const url = new URL(request.url);
	if (url.pathname.startsWith('/login/qr/')) return null;

	const query = url.searchParams;

	const token = await authenticator.isAuthenticated(request);
	const DBUser = (await getCachedUser(request))?.data;

	const type = query.get('type') as string | undefined;
	const backTo = getSafeBackTo(query.get('backTo'));
	const refreshProfile = query.get('refreshProfile') === 'true';

	if (!type || !allowedPlatforms.some((p) => p.toLowerCase() === type.toLowerCase())) {
		if (token) return redirect('/');
		else {
			const cookieHeader = request.headers.get('Cookie');
			const backToCookie = await loginInfo.parse(cookieHeader) || {};
			backToCookie.backTo = backTo;

			return {
				data: null,
				headers: { 'Set-Cookie': await loginInfo.serialize(backToCookie) },
			};
		}
	}

	if (token && DBUser && 'data' in DBUser && !refreshProfile && type === DBUser.data.mainLoginType.toLowerCase()) return redirect(backTo || '/');

	const cookieHeader = request.headers.get('Cookie');
	const backToCookie = await loginInfo.parse(cookieHeader) || {};
	backToCookie.backTo = backTo;
	backToCookie.refreshProfile = refreshProfile;

	if (query.get('add') === 'true' && DBUser && 'data' in DBUser) {
		backToCookie.currentUserId = DBUser.data.userId;
		return await authenticator.logout(request, {
			redirectTo: `/login?type=${type}&add=true&backTo=${backTo}`,
			headers: { 'Set-Cookie': await loginInfo.serialize(backToCookie) },
		});
	}

	try {
		return await authenticator.authenticate(type, request, {
			successRedirect: backTo,
			failureRedirect: '/',
			context: {
				currentUserId: 'currentUserId' in backToCookie ? backToCookie.currentUserId : undefined,
				device: parseUserAgent(request.headers.get('user-agent')),
				ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || undefined,
				refreshProfile: 'refreshProfile' in backToCookie ? String(backToCookie.refreshProfile) : undefined,
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

export default function Login() {
	const { allowedPlatforms = [], oidcDisplayName, qrLoginEnabled = true } = useContext(RootContext) || {};
	const [qrOpen, setQrOpen] = useState(false);
	const [searchParams] = useSearchParams();
	const { colorMode } = useColorMode();
	const location = useLocation();

	const allButtons = useMemo(() => platformButtons(allowedPlatforms), [allowedPlatforms]);
	const oidcButton = useMemo(() => allowedPlatforms.includes('oidc') ? oidcLoginButton(oidcDisplayName) : null, [allowedPlatforms, oidcDisplayName]);
	const hasSpecialLogin = !!oidcButton || qrLoginEnabled;
	const backTo = getSafeBackTo(searchParams.get('backTo'));
	if (location.pathname.startsWith('/login/qr')) return <Outlet />;

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 40 }} id='a1'>
			<Box maxWidth='500px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<Container gap={2} bg='transparent' p={0}>
					{allButtons.length ? allButtons.map((platform) => (
						<LinkButton
							to={`/login?type=${platform.key}${backTo ? `&backTo=${encodeURIComponent(backTo)}` : ''}`}
							id={`login-button-${platform.key}`}
							rounded={12}
							key={platform.key}
							bgColor={platform.color}
							color={colorMode === 'dark' ? 'gray.900' : 'white'}
							leftIcon={platform.faIcon({ boxSize: 6 })}
							pl={{ base: '25%', md: '30%' }}
							justifyContent='flex-start'
							variant='solid'
							size='lg'
							w='100%'
						>
							{platform.action} {platform.name}
						</LinkButton>
					)) : !hasSpecialLogin ? (
						<Box>
							No platforms enabled.
						</Box>
					) : null}

					{allButtons.length > 0 && hasSpecialLogin && (
						<Flex align='center' gap={3} my={2}>
							<Divider flex={1} />
							<Text color='gray.500' fontSize='sm'>or</Text>
							<Divider flex={1} />
						</Flex>
					)}

					{oidcButton && (
						<LinkButton
							to={`/login?type=${oidcButton.key}${backTo ? `&backTo=${encodeURIComponent(backTo)}` : ''}`}
							id={`login-button-${oidcButton.key}`}
							rounded={12}
							bgColor={oidcButton.color}
							color={colorMode === 'dark' ? 'gray.900' : 'white'}
							leftIcon={oidcButton.faIcon({ boxSize: 6 })}
							pl={{ base: '25%', md: '30%' }}
							justifyContent='flex-start'
							variant='solid'
							size='lg'
							w='100%'
						>
							{oidcButton.action} {oidcButton.name}
						</LinkButton>
					)}

					{qrLoginEnabled && (
						<Button
							type='button'
							onClick={() => setQrOpen(true)}
							leftIcon={qrLoginButton.faIcon({ boxSize: 6 })}
							color={colorMode === 'dark' ? 'gray.900' : 'white'}
							pl={{ base: '25%', md: '30%' }}
							justifyContent='flex-start'
							id='login-button-qr'
							bgColor={qrLoginButton.color}
							variant='solid'
							rounded={12}
							size='lg'
							w='100%'
						>
							{qrLoginButton.action} {qrLoginButton.name}
						</Button>
					)}
				</Container>
			</Box>
			{qrLoginEnabled && <QrLogin backTo={backTo || '/'} isOpen={qrOpen} onClose={() => setQrOpen(false)} />}
		</VStack>
	);
}
