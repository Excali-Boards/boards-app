import { Button, Container, Text, VStack, Badge, Divider, HStack, useToast, Icon, Spinner, Flex, Avatar } from '@chakra-ui/react';
import { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { UseInviteOutput } from '@excali-boards/boards-api-client';
import { ConfettiContainer } from '~/components/other/Confetti';
import { themeColor, WebReturnType } from '~/other/types';
import { useContext, useEffect, useState } from 'react';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';
import { FaGift } from 'react-icons/fa';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const rest = [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },

		{ property: 'og:image', content: '/banner.webp' },

		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:image', content: '/banner.webp' },

		{ name: 'theme-color', content: themeColor },
	];

	if (!data || 'error' in data) {
		return [
			{ title: 'Invalid Invite - Boards' },
			{ name: 'description', content: 'This invite link is invalid or has expired.' },
			{ property: 'og:title', content: 'Invalid Invite - Boards' },
			{ property: 'og:description', content: 'This invite link is invalid or has expired.' },
			...rest,
		];
	}

	return [
		{ title: 'Accept Invite - Boards' },
		{ name: 'description', content: 'You have been invited to collaborate on Boards!' },
		{ property: 'og:title', content: 'Accept Invite - Boards' },
		{ property: 'og:description', content: 'You have been invited to collaborate on Boards!' },
		...rest,
	];
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { code } = validateParams(params, ['code']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) return redirect(`/login?backTo=${encodeURIComponent(request.url)}`);

	const inviteDetails = await api?.invites.getInviteDetails({ auth: token, code });
	if (!inviteDetails || 'error' in inviteDetails) throw makeResponse(inviteDetails, 'Failed to fetch invite details.');

	return inviteDetails.data;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { code } = validateParams(params, ['code']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) return redirect(`/login?backTo=${encodeURIComponent(request.url)}`);

	const result = await api?.invites.useInvite({ auth: token, code });
	if (!result || 'error' in result) return makeResObject(result, 'Failed to accept invite.');

	return makeResObject(result, 'Successfully accepted invite.');
};

export default function AcceptInvite() {
	const invite = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};

	const actionData = useActionData<WebReturnType<UseInviteOutput>>();
	const navigation = useNavigation();
	const toast = useToast();

	const [showConfetti, setShowConfetti] = useState(false);

	const isSubmitting = navigation.state === 'submitting';

	useEffect(() => {
		if (actionData && 'data' in actionData) setShowConfetti(true);
	}, [actionData, toast]);

	const expiresAt = new Date(invite.expiresAt);
	const isExpired = expiresAt < new Date();

	const isInviter = user?.userId === invite.invitedBy.userId;
	const isAtMaxUses = invite.currentUses >= invite.maxUses;

	if (actionData && 'data' in actionData) {
		return (
			<Container maxW='lg' mt={{ base: 16, md: 32 }}>
				{showConfetti && <ConfettiContainer />}

				<VStack spacing={8}>
					<Flex
						direction='column'
						align='center'
						p={8}
						rounded='lg'
						bg='alpha100'
						transition='all 0.3s ease'
						w='full'
						gap={6}
					>
						<Icon as={FaGift} boxSize={14} color='green.300' />
						<Text fontSize='2xl' fontWeight='bold'>
							Invite Accepted!
						</Text>

						<Divider />

						<Text fontSize='md' textAlign='center'>
							You now have access to{' '}
							{actionData.data.details.groups.length > 0 && (
								<span>{actionData.data.details.groups.length} group{actionData.data.details.groups.length > 1 ? 's' : ''}</span>
							)}
							{actionData.data.details.categories.length > 0 && (
								<>
									{actionData.data.details.groups.length > 0 && ', '}
									<span>{actionData.data.details.categories.length} category{actionData.data.details.categories.length > 1 ? 'ies' : 'y'}</span>
								</>
							)}
							{actionData.data.details.boards.length > 0 && (
								<>
									{(actionData.data.details.groups.length > 0 || actionData.data.details.categories.length > 0) && ', '}
									<span>{actionData.data.details.boards.length} board{actionData.data.details.boards.length > 1 ? 's' : ''}</span>
								</>
							)}
							.
						</Text>
					</Flex>
				</VStack>
			</Container>
		);
	}

	if (actionData && 'error' in actionData) {
		return (
			<Container maxW='lg' mt={{ base: 16, md: 32 }}>
				<Flex
					direction='column'
					align='center'
					p={8}
					rounded='lg'
					bg='alpha100'
					transition='all 0.3s ease'
					w='full'
					gap={6}
				>
					<Icon as={FaGift} boxSize={14} color='red.300' />
					<Text fontSize='2xl' fontWeight='bold'>
						Failed to Accept Invite.
					</Text>

					<Divider />

					<Text fontSize='md' textAlign='center'>
						{actionData.error}
					</Text>
				</Flex>
			</Container>
		);
	}

	return (
		<Container maxW='lg' mt={{ base: 16, md: 32 }}>
			<Flex
				direction='column'
				align='center'
				p={8}
				rounded='lg'
				bg='alpha100'
				transition='all 0.3s ease'
				w='full'
				gap={6}
			>
				<Icon as={FaGift} boxSize={14} color='purple.300' />
				<Text fontSize='2xl' fontWeight='bold'>
					You&apos;re Invited!
				</Text>

				<Divider />

				<HStack spacing={4} w='full'>
					<Avatar name={invite.invitedBy.displayName} src={invite.invitedBy.avatarUrl || undefined} />

					<VStack spacing={0} align='start'>
						<HStack spacing={2}>
							<Text fontSize='xl' fontWeight='semibold'>{invite.invitedBy.displayName}</Text>
							<Badge fontFamily='mono' colorScheme='purple'>Inviter</Badge>
						</HStack>

						<Text fontSize='sm' color='gray.500'>
							Via <Text as='span' fontFamily='mono'>{invite.code}</Text>
						</Text>
					</VStack>
				</HStack>

				<Divider />

				<Form method='post' style={{ width: '100%' }}>
					<Button
						type='submit'
						size='lg'
						w='full'
						isLoading={isSubmitting}
						loadingText='Accepting..'
						isDisabled={isExpired || isAtMaxUses || isInviter}
						colorScheme={isExpired || isAtMaxUses || isInviter ? 'red' : 'purple'}
						leftIcon={isSubmitting ? <Spinner size='sm' /> : <Icon as={FaGift} />}
					>
						{isExpired ? 'Invite Expired' : isAtMaxUses ? 'Invite Maxed Out' : isInviter ? 'Owned Invite' : 'Accept Invite'}
					</Button>
				</Form>
			</Flex>
		</Container>
	);
}
