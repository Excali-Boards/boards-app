import { VStack, Box, Divider, Flex, Input, Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, useToast, IconButton, Tooltip, Text, FormControl, FormLabel } from '@chakra-ui/react';
import { securityUtils, convertPlatform, makeResponse, makeResObject } from '~/utils/functions.server';
import { FaEye, FaEyeSlash, FaLink, FaTrash, FaUnlink, FaUser } from 'react-icons/fa';
import { Platforms } from '@excali-boards/boards-api-client/prisma/generated/client';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { Fragment, useCallback, useContext, useMemo, useState } from 'react';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { allowedPlatforms, convertName } from '~/utils/config.server';
import MenuBar, { CustomButton } from '~/components/layout/MenuBar';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { ConfirmModal } from '~/components/other/ConfirmModal';
import { UserInput } from '@excali-boards/boards-api-client';
import { Container } from '~/components/layout/Container';
import { clearUserCache } from '~/utils/session.server';
import { platformButtons } from '~/other/platforms';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { MdDesktopWindows } from 'react-icons/md';
import { LinkButton } from '~/components/Button';
import { WebReturnType } from '~/other/types';
import { GrConfigure } from 'react-icons/gr';
import { FiLogOut } from 'react-icons/fi';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBUser = await api?.users.getCurrentUser({ auth: token });
	if (!DBUser || 'error' in DBUser) throw makeResponse(DBUser, 'Failed to get user data.');

	const DBGroups = await api?.groups.getGroups({ auth: token });
	if (!DBGroups || 'error' in DBGroups) throw makeResponse(DBGroups, 'Failed to get groups.');

	return {
		groups: DBGroups.data || [],
		platforms: allowedPlatforms.map((p) => {
			const method = DBUser.data.loginMethods.find((l) => l.platform === convertPlatform(p));

			return {
				id: p,
				key: convertName(p),
				name: convertPlatform(p),
				isConnected: !!method,
				connectedEmail: method?.platformEmail || null,
				connectedEmailDecrypted: method?.platformEmail ? securityUtils.decrypt(method.platformEmail) : null,
			};
		}).filter((p) => p.name !== DBUser.data.mainLoginType).reverse() || [],
		user: {
			...DBUser.data,
			decryptedEmail: securityUtils.decrypt(DBUser.data.email),
		},
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'updateUser': {
			const userData = JSON.parse(formData.get('userData') as string);
			const result = await api?.users.updateUser({ auth: token, body: userData });

			if (result?.status === 200) await clearUserCache(token);
			return makeResObject(result, 'Failed to update user.');
		}
		case 'deleteAccount': {
			const result = await api?.users.deleteAccount({ auth: token });

			if (result?.status === 200) return authenticator.logout(request, { redirectTo: '/' });
			else return makeResObject(result, 'Failed to delete account.');
		}
		case 'logout': {
			return authenticator.logout(request, { redirectTo: '/' });
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Profile() {
	const [modalShown, setModalShown] = useState<'logout' | 'change' | 'delete' | null>(null);

	const [showEmail, setShowEmail] = useState(false);

	const { allowedPlatforms } = useContext(RootContext) || {};
	const { user, groups, platforms } = useLoaderData<typeof loader>();
	const toast = useToast();

	const fetcher = useFetcher<WebReturnType<string>>();
	useFetcherResponse(fetcher, toast, () => setModalShown(null));

	const allPlatformData = useMemo(() => platformButtons(allowedPlatforms || []), [allowedPlatforms]);
	const customButtons = useMemo(() => {
		const buttons: CustomButton<'link'>[] = [{
			type: 'link',
			to: '/sessions',
			icon: <MdDesktopWindows />,
			label: 'Manage Sessions',
			tooltip: 'Manage sessions',
		}];

		if (user.isDev) {
			buttons.push({
				type: 'link',
				to: '/admin',
				icon: <FaUser />,
				label: 'Administration',
				tooltip: 'Administration',
			});
		}

		return buttons;
	}, [user]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Account Settings'}
					image={user?.avatarUrl || undefined}
					description={'Manage your account settings, linked platforms, sessions, and more.'}
					customButtons={customButtons}
					goBackPath='/'
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
								<Input value={user.userId} isReadOnly />
							</Flex>

							<Flex flexDir={'column'} gap={2} justifyContent='flex-end'>
								<Tooltip label='Change main platform or main group' hasArrow>
									<IconButton
										aria-label={'Change'}
										icon={<GrConfigure size={20} />}
										onClick={() => setModalShown('change')}
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
				</Container>

				{platforms.length > 0 && (
					<Fragment>
						<Divider my={4} />

						<Container>
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
						</Container>
					</Fragment>
				)}

				<Divider my={4} />

				<Container>
					<Flex
						gap={2}
						width='100%'
						justifyContent='space-between'
						flexDir={{ base: 'column-reverse', md: 'row' }}
						alignItems={{ base: 'stretch', md: 'center' }}
					>
						<Button
							width='100%'
							leftIcon={<FaTrash />}
							onClick={() => setModalShown('delete')}
							colorScheme='red'
						>
							Delete Account
						</Button>

						<Button
							width='100%'
							leftIcon={<FiLogOut />}
							onClick={() => setModalShown('logout')}
						>
							Logout
						</Button>
					</Flex>
				</Container>
			</Box>

			<ConfirmModal
				title='Logout'
				isOpen={modalShown === 'logout'}
				onClose={() => setModalShown(null)}
				onConfirm={() => fetcher.submit({ type: 'logout' }, { method: 'post' })}
				message={'Are you sure you want to logout?\nYou can always log back in later.'}
				confirmText='Logout'
				colorScheme='red'
			/>

			<UpdateUserModal
				fetcher={fetcher}
				isOpen={modalShown === 'change'}
				onClose={() => setModalShown(null)}
				currentMainPlatform={user?.mainLoginType}
				currentMainGroupId={user?.mainGroupId || null}
				linkedPlatforms={platforms.filter((p) => p.isConnected).map((p) => p.key)}
				groups={groups}
			/>

			{modalShown === 'delete' && (
				<ConfirmModal
					isOpen={true}
					onClose={() => setModalShown(null)}
					onConfirm={() => {
						fetcher.submit({ type: 'deleteAccount' }, { method: 'post' });
						setModalShown(null);
					}}
					title='Delete Account'
					message='Are you sure you want to permanently delete your account? This action cannot be undone and will remove all of your data.'
					isLoading={fetcher.state === 'submitting'}
					confirmText='Delete Account'
					colorScheme='red'
				/>
			)}
		</VStack>
	);
}

export type PlatformProps = {
	icon: JSX.Element;
	text: string;
	title: string;
	manageUrl: string;
	isConnected: boolean;
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
						colorScheme={isConnected ? 'red' : 'gray'}
						leftIcon={isConnected ? <FaUnlink /> : <FaLink />}
						width={{ base: '100%', md: 'auto' }}
						to={manageUrl}
					>
						{isConnected ? 'Unlink' : 'Link'}
					</LinkButton>
					{otherButtons?.map((b, i) => (
						<Tooltip key={i} label={b.label} hasArrow>
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

export type UpdateUserModalProps = {
	isOpen: boolean;
	onClose: () => void;
	linkedPlatforms: Platforms[];
	currentMainPlatform: Platforms;
	currentMainGroupId: string | null;
	fetcher: FetcherWithComponents<unknown>;
	groups: { id: string; name: string; }[];
};

export function UpdateUserModal({ isOpen, onClose, currentMainPlatform, linkedPlatforms, groups, currentMainGroupId, fetcher }: UpdateUserModalProps) {
	const [mainPlatform, setMainPlatform] = useState<Platforms>(currentMainPlatform);
	const [mainGroup, setMainGroup] = useState<string | null>(currentMainGroupId);

	const { colorMode } = useColorMode();

	const submitForm = useCallback(() => {
		const userData: UserInput = {};
		if (mainPlatform !== currentMainPlatform) userData.platform = mainPlatform;
		if (mainGroup !== currentMainGroupId) userData.mainGroupId = mainGroup === 'none' ? null : mainGroup;

		if (Object.keys(userData).length === 0) {
			onClose();
			return;
		}

		fetcher.submit({ type: 'updateUser', userData: JSON.stringify(userData) }, { method: 'post' });
	}, [mainGroup, mainPlatform, fetcher, currentMainGroupId, currentMainPlatform, onClose]);

	const groupOptions = useMemo(() => {
		return [{ value: 'none', label: 'None' }, ...groups.map((g) => ({ value: g.id, label: g.name }))];
	}, [groups]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered size='lg'>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Account Settings</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<VStack spacing={4}>
						<Text fontSize='sm' color='gray.500' mt={-2} mb={2}>
							Your main platform is the one used to display your username and profile picture. They will be loaded from this platform when you log in next time.
						</Text>

						<FormControl>
							<FormLabel>Current main platform</FormLabel>
							<Input value={currentMainPlatform} isReadOnly />
						</FormControl>

						<FormControl>
							<FormLabel>New main platform</FormLabel>
							<Select
								name='mainPlatform'
								colorScheme='brand'
								value={mainPlatform}
								placeholder='Select main platform..'
								options={linkedPlatforms}
								onChange={(e) => setMainPlatform(e as Platforms)}
								isDisabled={linkedPlatforms.length < 2}
							/>
						</FormControl>

						<Divider />

						<Text fontSize='sm' color='gray.500' mt={-2} mb={2}>
							Your main group is the one that opens when you navigate to the home page. You can set it to &apos;None&apos; to show all groups.
						</Text>

						<FormControl>
							<FormLabel>Current main group</FormLabel>
							<Input value={currentMainGroupId ? groups.find((g) => g.id === currentMainGroupId)?.name || 'Unknown' : 'None'} isReadOnly />
						</FormControl>

						<FormControl>
							<FormLabel>New main group</FormLabel>
							<Select
								name='mainGroup'
								colorScheme='brand'
								placeholder='Select main group..'
								defaultValue={groupOptions.find((g) => g.value === (currentMainGroupId || 'none'))}
								onChange={(e) => setMainGroup(e?.value === 'none' ? null : e?.value || null)}
								options={groupOptions}
							/>
						</FormControl>
					</VStack>
				</ModalBody>
				<ModalFooter display={'flex'} gap={1}>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
					>
						Cancel
					</Button>
					<Button
						flex={1}
						isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
						colorScheme='blue'
						onClick={submitForm}
					>
						Save Changes
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
