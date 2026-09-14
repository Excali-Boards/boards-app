import { Avatar, Box, Button, Divider, Flex, FormControl, FormLabel, HStack, Icon, Text, useColorMode, VStack } from '@chakra-ui/react';
import { getIpHeaders, rejectCrossSiteRequest } from '~/utils/functions.server';
import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node';
import { FaCheckCircle, FaMobileAlt, FaTimesCircle } from 'react-icons/fa';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Container } from '~/components/layout/Container';
import { getCachedUser } from '~/utils/session.server';
import { qrSessionDurations } from '~/other/qr-login';
import { platformButtons } from '~/other/platforms';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { LinkButton } from '~/components/Button';
import config from '~/utils/config.server';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';

export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userCode = new URL(request.url).searchParams.get('code')?.trim() || null;
	const token = await authenticator.isAuthenticated(request);
	const isAuthenticated = !!token;
	if (!userCode || !api) return json({ available: false as const, isAuthenticated }, { headers: { 'Cache-Control': 'no-store' } });

	const result = await api.sessions.lookupQrLoginChallenge({
		auth: config.apiToken,
		body: { userCode },
		headers: getIpHeaders(request) || undefined,
	});

	if ('error' in result) return json({ available: false as const, isAuthenticated }, { headers: { 'Cache-Control': 'no-store' } });

	const cachedUser = token ? await getCachedUser(request) : undefined;
	const user = cachedUser?.data && 'data' in cachedUser.data ? {
		displayName: cachedUser.data.data.displayName,
		avatarUrl: cachedUser.data.data.avatarUrl,
	} : null;

	return json({
		available: true as const,
		isAuthenticated,
		userCode: result.data.userCode,
		status: result.data.status as ApprovalStatus,
		expiresAt: result.data.expiresAt,
		requestDevice: result.data.requestDevice,
		user,
	}, { headers: { 'Cache-Control': 'no-store' } });
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const csrfError = rejectCrossSiteRequest(request);
	if (csrfError) return csrfError;
	const token = await authenticator.isAuthenticated(request);
	if (!token) return json({ status: 401 as const, error: 'Sign in on this phone before approving the browser.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });

	const formData = await request.formData();
	const userCode = formData.get('userCode');
	const intent = formData.get('intent');
	if (typeof userCode !== 'string' || (intent !== 'approve' && intent !== 'deny')) {
		return json({ status: 400 as const, error: 'This QR login request is unavailable.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
	}

	if (!api) return json({ status: 503 as const, error: 'QR login is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
	const result = await api.sessions.decideQrLogin({
		auth: token,
		body: {
			userCode,
			decision: intent,
			expiresInSeconds: intent === 'approve' ? Number(formData.get('expiresInSeconds')) : undefined,
		},
		headers: getIpHeaders(request) || undefined,
	});

	if ('error' in result) return json({ status: 400 as const, error: 'This QR login request is unavailable or has already been handled.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
	return json({ status: 200 as const, decision: intent, expiresAt: 'expiresAt' in result.data ? result.data.expiresAt : undefined }, { headers: { 'Cache-Control': 'no-store' } });
};

export default function ApproveQrLogin() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const { allowedPlatforms: enabledPlatforms = [] } = useContext(RootContext) || {};
	const { colorMode } = useColorMode();

	const platforms = useMemo(() => platformButtons(enabledPlatforms), [enabledPlatforms]);
	const [now, setNow] = useState(() => Date.now());
	const expiresAt = data.available ? data.expiresAt : null;

	useEffect(() => {
		if (!expiresAt) return;
		const interval = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(interval);
	}, [expiresAt]);

	if (!data.available) {
		return <QrApprovalLayout><Text color='red.400'>This QR login request is unavailable or has expired.</Text></QrApprovalLayout>;
	}

	const approvalPath = `/login/qr/approve?code=${encodeURIComponent(data.userCode)}`;
	const approved = (actionData?.status === 200 && actionData.decision === 'approve') || data.status === 'approved';
	const denied = (actionData?.status === 200 && actionData.decision === 'deny') || data.status === 'denied';
	const expired = new Date(data.expiresAt).getTime() <= now;

	if (!data.isAuthenticated) {
		return (
			<QrApprovalLayout>
				<HStack align='center' w='100%' spacing={3}><FaMobileAlt /><Text fontSize={{ base: 'xl', sm: '2xl' }} fontWeight='bold' lineHeight='short'>Approve browser sign-in</Text></HStack>
				<Text>Sign in on this phone to review and approve the browser request.</Text>
				<Text fontSize='lg' fontWeight='bold' textAlign='center'>Matching code: {data.userCode}</Text>
				<Text fontSize='sm' color='gray.500' textAlign='center'>After signing in, approve only if this code matches the code shown on the browser.</Text>
				{platforms.length ? platforms.map((platform) => (
					<LinkButton key={platform.name} to={`/login?type=${platform.name.toLowerCase()}&backTo=${encodeURIComponent(approvalPath)}`} bgColor={platform.color} color={colorMode === 'dark' ? 'gray.900' : 'white'} leftIcon={platform.icon({ boxSize: 6 })} justifyContent='center' variant='solid' size='lg' w='100%' rounded={12}>Continue with {platform.name}</LinkButton>
				)) : <Text>No platforms enabled.</Text>}
			</QrApprovalLayout>
		);
	}

	return (
		<QrApprovalLayout>
			<HStack align='center' w='100%' spacing={3}><FaMobileAlt /><Text fontSize={{ base: 'xl', sm: '2xl' }} fontWeight='bold' lineHeight='short'>Approve browser sign-in</Text></HStack>
			{data.user && <HStack w='100%' spacing={3} p={3} bg='alpha100' borderRadius='md'>
				<Avatar size='sm' name={data.user.displayName} src={data.user.avatarUrl || undefined} />
				<Box minW={0}><Text fontSize='sm' color='gray.500'>Signed in as</Text><Text fontWeight='bold' noOfLines={1}>{data.user.displayName}</Text></Box>
			</HStack>}
			<Text fontSize='lg' fontWeight='bold' textAlign='center'>Matching code: {data.userCode}</Text>
			{data.requestDevice && <VStack spacing={1} w='100%'>
				<Text fontSize='sm' color='gray.500'>Requesting device</Text>
				<Text textAlign='center'>{data.requestDevice}</Text>
			</VStack>}
			<Text fontSize='sm' color='gray.500' textAlign='center'>Only approve if this code matches the code displayed on the browser you are signing in.</Text>

			{approved || denied ? (
				<Flex direction='column' align='center' p={8} rounded='lg' bg='alpha100' w='100%' gap={6}>
					<Icon as={approved ? FaCheckCircle : FaTimesCircle} boxSize={14} color={approved ? 'green.300' : 'red.300'} />
					<Text fontSize='2xl' fontWeight='bold' textAlign='center'>{approved ? 'Browser Sign-in Approved' : 'Browser Sign-in Denied'}</Text>
					<Divider />
					<Text textAlign='center'>
						{approved
							? `You can return to the other device. Its session expires ${actionData?.status === 200 && actionData.decision === 'approve' && actionData.expiresAt ? new Date(actionData.expiresAt).toLocaleString() : 'at its selected time'}.`
							: 'You can return to the other device.'}
					</Text>
				</Flex>
			) : expired ? (
				<Text color='red.400'>This QR login request has expired or was already used.</Text>
			) : (
				<Form method='post' style={{ width: '100%' }}>
					<input type='hidden' name='userCode' value={data.userCode} />
					<FormControl isRequired mb={4}><FormLabel>How long should this browser stay signed in?</FormLabel><Select id='qr-login-expiry' name='expiresInSeconds' options={qrSessionDurations} defaultValue={qrSessionDurations[2]} /></FormControl>
					<Flex w='100%' gap={1} direction='row'>
						<Button flex={1} w='100%' type='submit' name='intent' value='deny' colorScheme='red'>Deny</Button>
						<Button flex={1} w='100%' type='submit' name='intent' value='approve' colorScheme='green'>Approve</Button>
					</Flex>
				</Form>
			)}

			{actionData && actionData.status !== 200 && <Text color='red.400'>{actionData.error}</Text>}
		</QrApprovalLayout>
	);
}

function QrApprovalLayout({ children }: { children: React.ReactNode; }) {
	return <VStack w='100%' align='center' px={4} mt={{ base: 8, md: 20 }}><Box maxWidth='500px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }}><Container gap={5} alignItems='center'>{children}</Container></Box></VStack>;
}
