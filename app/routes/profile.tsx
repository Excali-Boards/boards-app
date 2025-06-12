import { VStack, Box, Divider, Flex, Input, Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, useToast, IconButton, VisuallyHiddenInput, Tooltip, Text } from '@chakra-ui/react';
import { securityUtils, convertPlatform, makeResponse, makeResObject } from '~/utils/functions.server';
import { FaEye, FaEyeSlash, FaLink, FaSave, FaUnlink, FaUser } from 'react-icons/fa';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { Platforms } from '@excali-boards/boards-api-client/prisma/generated';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { Fragment, useContext, useMemo, useState } from 'react';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { Container } from '~/components/layout/Container';
import { allowedPlatforms } from '~/utils/config.server';
import { platformButtons } from '~/other/platforms';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { LinkButton } from '~/components/Button';
import { WebReturnType } from '~/other/types';
import { GrConfigure } from 'react-icons/gr';
import { Stats } from '~/components/Stats';
import { FiLogOut } from 'react-icons/fi';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';

export async function loader({ request }: LoaderFunctionArgs) {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const userStats = await api?.stats.userStats({ auth: token });
	if (!userStats || 'error' in userStats) throw makeResponse(userStats, 'Failed to get user stats.');

	const DBUser = await api?.users.getCurrentUser({ auth: token, full: true });
	if (!DBUser || 'error' in DBUser) throw makeResponse(DBUser, 'Failed to get user data.');

	const AllGroups = await api?.groups.getGroups({ auth: token });
	if (!AllGroups || 'error' in AllGroups) throw makeResponse(AllGroups, 'Failed to get groups.');

	return {
		userStats: userStats.data,
		groups: AllGroups.data.groups || [],
		platforms: allowedPlatforms.map((p) => {
			const method = DBUser.data.loginMethods.find((l) => l.platform === convertPlatform(p));

			return {
				id: p,
				name: convertPlatform(p),
				isConnected: !!method,
				connectedEmail: method?.email || null,
				connectedEmailDecrypted: method?.email ? securityUtils.decrypt(method.email) : null,
			};
		}).filter((p) => p.name !== DBUser.data.mainLoginType).reverse() || [],
		user: {
			...DBUser.data,
			decryptedEmail: securityUtils.decrypt(DBUser.data.email),
		},
	};
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'changeMainPlatform': {
			const newMainPlatform = formData.get('mainPlatform') as Platforms;
			if (!allowedPlatforms.some((p) => p.toLowerCase() === newMainPlatform.toLowerCase())) return { status: 400, error: 'Invalid request.' };

			const ChangedMainPlatform = await api?.users.changeMainPlatform({ auth: token, newMainPlatform });
			if (!ChangedMainPlatform || 'error' in ChangedMainPlatform) return makeResObject(ChangedMainPlatform, 'Failed to change main platform.');

			return { status: 200, data: 'Successfully changed main platform.' };
		}
		case 'changeMainGroup': {
			let newMainGroup: string | null = formData.get('mainGroup') as string;
			if (!newMainGroup) return { status: 400, error: 'Invalid request.' };
			else if (newMainGroup === 'none') newMainGroup = null;

			const ChangedMainGroup = await api?.users.changeMainGroup({ auth: token, newMainGroupId: newMainGroup });
			if (!ChangedMainGroup || 'error' in ChangedMainGroup) return makeResObject(ChangedMainGroup, 'Failed to change main group.');

			return { status: 200, data: 'Successfully changed main group.' };
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Profile() {
	const [modalShown, setModalShown] = useState<'logout' | 'change' | null>(null);
	const [showEmail, setShowEmail] = useState(false);

	const { allowedPlatforms } = useContext(RootContext) || {};
	const { user, groups, platforms, userStats } = useLoaderData<typeof loader>();
	const toast = useToast();

	const fetcher = useFetcher<WebReturnType<string>>();
	useFetcherResponse(fetcher, toast);

	const allPlatformData = useMemo(() => platformButtons(allowedPlatforms || []), [allowedPlatforms]);
	const [mainGroup, setMainGroup] = useState(user?.mainGroupId || '');

	const getMainGroup = useMemo(() => {
		if (!mainGroup) return undefined;
		return groups.find((g) => g.id === mainGroup);
	}, [mainGroup, groups]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Account Settings'}
					image={user?.avatarUrl || undefined}
					description={'Manage your account settings, linked platforms, and more.'}
					goBackPath='/'
					hideSortButton
					customButtons={user?.isDev || user?.isBoardsAdmin ? [{
						type: 'link',
						to: '/admin',
						icon: <FaUser />,
						label: 'Administration.',
						tooltip: 'Administration.',
					}] : []}
				/>

				<Divider my={4} />

				<Container>
					<Flex flexDir={'column'} gap={4}>
						<Flex gap={1}>
							<Flex flexDir={'column'} gap={2} flex={1}>
								<Text fontWeight='bold'>Username</Text>
								<Input value={user?.displayName} isReadOnly />
							</Flex>

							<Flex flexDir={'column'} gap={2} flex={1}>
								<Text fontWeight='bold'>User Id</Text>
								<Input value={user.id} isReadOnly />
							</Flex>

							<Flex flexDir={'column'} gap={2} justifyContent="flex-end">
								<Tooltip label='Change main platform.' aria-label='Change main platform'>
									<IconButton
										aria-label={'Change'}
										icon={<GrConfigure size={20} />}
										onClick={() => setModalShown('change')}
										isDisabled={user.loginMethods.length < 1}
									/>
								</Tooltip>
							</Flex>
						</Flex>
						<Flex gap={1} flexDir={'column'} >
							<Text fontWeight='bold'>{user.mainLoginType + (showEmail ? ' Email' : ' Email (hidden)')}</Text>
							<Flex alignItems='center' gap={2}>
								<Input value={showEmail ? user.decryptedEmail : user.email} isReadOnly type='text' />
								<IconButton
									aria-label={showEmail ? 'Hide Email' : 'Show Email'}
									icon={showEmail ? <FaEye /> : <FaEyeSlash />}
									onClick={() => setShowEmail(!showEmail)}
								/>
							</Flex>
						</Flex>
					</Flex>

					{!!platforms.length && <Divider my={4} />}

					{platforms.map((p, i) => (
						<Platform
							key={p.id}
							icon={allPlatformData.find((d) => d.name.toLowerCase() === p.id.toLowerCase())?.faIcon({ boxSize: 10 }) || <FaLink />}
							title={p.name}
							isConnected={p.isConnected}
							manageUrl={p.isConnected ? `/unlink/${p.name.toLowerCase()}?backTo=/profile` : `/login?type=${p.name.toLowerCase()}&add=true&backTo=/profile`}
							text={p.isConnected ? `Connected with ${p.name} as ${showEmail ? p.connectedEmailDecrypted : p.connectedEmail}.` : `Connect your ${p.name} account.`}
							addDivider={i < platforms.length - 1}
						/>
					))}

					<Divider my={4} />

					<Flex gap={1} flexDir={'column'}>
						<Text fontWeight='bold'>Main Group</Text>
						<Flex alignItems='center' gap={2}>
							<Select
								name='mainGroup'
								placeholder='Group that opens by navigating to home page.'
								options={[{ value: 'none', label: 'None' }, ...groups.map((g) => ({ value: g.id, label: g.name }))]}
								onChange={(e) => e && setMainGroup(e.value)}
								defaultValue={getMainGroup ? { value: getMainGroup.id, label: getMainGroup.name } : undefined}
							/>

							<IconButton
								icon={<FaSave />}
								onClick={() => mainGroup && fetcher.submit({ type: 'changeMainGroup', mainGroup }, { method: 'post' })}
								isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
								isDisabled={groups.length < 1 || !mainGroup}
								aria-label='Change main group'
							/>
						</Flex>
					</Flex>

					<Divider my={4} />
					<Stats stats={userStats} />
					<Divider my={4} />

					<Button leftIcon={<FiLogOut />} onClick={() => setModalShown('logout')}>
						Logout
					</Button>
				</Container>
			</Box>

			<LogoutModal isOpen={modalShown === 'logout'} onClose={() => setModalShown(null)} />

			<ChangeMainPlatformModal
				fetcher={fetcher}
				isOpen={modalShown === 'change'}
				onClose={() => setModalShown(null)}
				currentMainPlatform={user?.mainLoginType}
				linkedPlatforms={platforms.filter((p) => p.isConnected).map((p) => p.name)}
			/>
		</VStack>
	);
}

export type PlatformProps = {
	icon: JSX.Element;
	text: string;
	title: string;
	isConnected: boolean;
	manageUrl: string;
	addDivider?: boolean;
	otherButtons?: {
		icon: JSX.Element;
		colorScheme: string;
		onClick: () => void;
		ariaLabel: string;
		label: string;
	}[];
};

export function Platform({ icon, title, isConnected, manageUrl, text, addDivider, otherButtons }: PlatformProps) {
	return (
		<Fragment>
			<Box
				display='flex'
				justifyContent='space-between'
				alignItems={{ base: 'start', md: 'center' }}
				flexDir={{ base: 'column', md: 'row' }}
				gap={2}
			>
				<Box display='flex' alignItems='center'>
					{icon}
					<Box ml={4}>
						<Text fontWeight='bold'>{title}</Text>
						<Text color='gray.400' wordBreak={'break-word'}>{text}</Text>
					</Box>
				</Box>
				<Box display='flex' alignItems='center' width={{ base: '100%', md: 'auto' }}>
					<LinkButton
						colorScheme={isConnected ? 'red' : 'brand'}
						leftIcon={isConnected ? <FaUnlink /> : <FaLink />}
						width={{ base: '100%', md: 'auto' }}
						to={manageUrl}
					>
						{isConnected ? 'Odvoji' : 'Poveži'}
					</LinkButton>
					{otherButtons?.map((b, i) => (
						<Tooltip key={i} label={b.label}>
							<IconButton
								ml={2}
								key={i}
								icon={b.icon}
								onClick={b.onClick}
								colorScheme={b.colorScheme}
								aria-label={b.ariaLabel}
							/>
						</Tooltip>
					))}
				</Box>
			</Box>

			{addDivider && <Divider my={4} />}
		</Fragment>
	);
}

export type ChangeMainPlatformModalProps = {
	isOpen: boolean;
	onClose: () => void;
	currentMainPlatform: string;
	linkedPlatforms: string[];
	fetcher: FetcherWithComponents<unknown>;
};

export function ChangeMainPlatformModal({ isOpen, onClose, currentMainPlatform, linkedPlatforms, fetcher }: ChangeMainPlatformModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={() => onClose()}
			isCentered
		>
			<ModalOverlay />
			<ModalContent bg={useColorMode().colorMode === 'dark' ? 'gray900' : 'white'} mx={2}>
				<fetcher.Form method='post'>
					<ModalHeader>Change Main Platform</ModalHeader>
					<ModalCloseButton />
					<ModalBody display={'flex'} gap={4} flexDir={'column'}>
						<VisuallyHiddenInput onChange={() => { }} name='type' value='changeMainPlatform' />

						<Text fontSize='sm' color='gray.500' mt={-2} mb={2}>
							Your main platform is the one used to display your username and profile picture. Changing the main platform will load your username and profile picture from the new platform.
						</Text>

						<Flex gap={1} flexDir={'column'} >
							<Text fontWeight='bold'>Current main platform</Text>
							<Input value={currentMainPlatform} isReadOnly />
						</Flex>

						<Flex gap={1} flexDir={'column'} >
							<Text fontWeight='bold'>New main platform</Text>
							<Select
								variant='filled'
								name='mainPlatform'
								colorScheme='brand'
								placeholder='New main platform'
								options={linkedPlatforms.map((p) => ({ value: p.toLowerCase(), label: p }))}
								selectedOptionStyle={undefined}
							/>
						</Flex>
					</ModalBody>
					<ModalFooter display={'flex'} gap={1}>
						<Button
							colorScheme='gray'
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
							colorScheme='red'
							type='submit'
						>
							Change
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}

export type LogoutModalProps = {
	isOpen: boolean;
	onClose: () => void;
	backTo?: string;
};

export function LogoutModal({ isOpen, onClose, backTo }: LogoutModalProps) {
	return (
		<Modal
			isOpen={isOpen}
			onClose={() => onClose()}
			isCentered
		>
			<ModalOverlay />
			<ModalContent bg={useColorMode().colorMode === 'dark' ? 'gray900' : 'white'} mx={2}>
				<ModalHeader>Logout</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					Are you sure you want to logout? <br />
					You can always log back in later.
				</ModalBody>
				<ModalFooter display={'flex'} gap={1}>
					<Button
						colorScheme='gray'
						onClick={onClose}
					>
						Cancel
					</Button>
					<LinkButton
						to={'/logout' + (backTo ? `?backTo=${backTo}` : '')}
						reloadDocument={true}
						colorScheme='red'
						type='button'
					>
						Logout
					</LinkButton>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}

