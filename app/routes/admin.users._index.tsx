import { VStack, Box, Divider, Flex, HStack, IconButton, VisuallyHiddenInput, Text, Button, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, useToast, Input, Tooltip, Checkbox } from '@chakra-ui/react';
import { BoardPermissionType } from '@excali-boards/boards-api-client/prisma/generated';
import { makeResObject, makeResponse, securityUtils } from '~/utils/functions.server';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { GetUsersOutput } from '@excali-boards/boards-api-client';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { SearchBar } from '~/components/layout/SearchBar';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { WebReturnType } from '~/other/types';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';
import { FaCog } from 'react-icons/fa';

export type Permissions = {
	boardId: string;
	permissionType: BoardPermissionType;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const allUsers = await api?.users.getUsers({ auth: token });
	if (!allUsers || 'error' in allUsers) throw makeResponse(allUsers, 'Failed to get users.');

	const allGroups = await api?.groups.getAllSorted({ auth: token });
	if (!allGroups || 'error' in allGroups) throw makeResponse(allGroups, 'Failed to get boards.');

	const groupBoardsByCategory = allGroups.data.list.flatMap((group) => group.categories.map((category) => ({
		label: category.name,
		options: category.boards.map((board) => ({
			value: board.id,
			label: board.name,
		})),
	}))).reduce((acc, category) => {
		acc[category.label] = acc[category.label] || { label: category.label, options: [] };
		acc[category.label].options.push(...category.options);
		return acc;
	}, {} as Record<string, { label: string; options: { value: string; label: string }[]; }>);

	return {
		allBoards: Object.values(groupBoardsByCategory),
		allUsers: allUsers.data.map((user) => ({
			...user,
			decryptedEmail: securityUtils.decrypt(user.email),
		})).sort((a, b) => {
			if (a.isDev && !b.isDev) return -1;
			if (!a.isDev && b.isDev) return 1;
			if (a.isBoardsAdmin && !b.isBoardsAdmin) return -1;
			if (!a.isBoardsAdmin && b.isBoardsAdmin) return 1;
			return 1;
		}),
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'updateUser': {
			const userId = formData.get('userId') as string;
			if (!userId) return { status: 400, error: 'Invalid user id.' };

			const isBoardsAdmin = formData.get('isBoardsAdmin') === 'true';
			const boardsData = formData.get('boards') as string;
			const permissions: Permissions[] = [];

			try {
				if (boardsData) permissions.push(...JSON.parse(boardsData) as Permissions[]);
			} catch {
				return { status: 400, error: 'Invalid permissions data.' };
			}

			const TargetDBUser = await api?.admin.updateUserPermissions({ auth: token, body: { userId, isBoardsAdmin, permissions } });
			if (!TargetDBUser || 'error' in TargetDBUser) return makeResObject(TargetDBUser, 'Failed to update user permissions.');

			return { status: 200, data: 'User permissions updated successfully.' };
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function AdminUsers() {
	const { allUsers, allBoards } = useLoaderData<typeof loader>();
	const { user: currentUser } = useContext(RootContext) || {};

	const [modalType, setModalType] = useState<'update' | 'delete' | null>(null);
	const [manageUser, setManageUser] = useState<GetUsersOutput & { decryptedEmail: string } | null>(null);

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setManageUser(null));

	const finalUsers = useMemo(() => {
		if (!dbcSearch) return allUsers;
		return allUsers.filter((b) => dbcSearch ? b.displayName.includes(dbcSearch) || b.email.includes(dbcSearch) : true);
	}, [allUsers, dbcSearch]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Manage Users'}
					description={'Manage users and their access to certain boards.'}
					goBackPath='/admin'
					hideSortButton
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'users'} id='users' dividerMY={4} />

				<VStack w={'100%'} spacing={2}>
					{finalUsers.length ? finalUsers.map((user, i) => (
						<Flex
							key={i}
							rounded={'lg'}
							bg={'alpha100'}
							py={4}
							px={6}
							w={'100%'}
							_hover={{ bg: 'alpha200' }}
							transition={'all 0.3s ease'}
							alignItems={'center'}
							justifyContent={'space-between'}
							wordBreak={'break-word'}
						>
							<Flex
								alignItems={{ base: 'start', md: 'center' }}
								flexDir={{ base: 'column', md: 'row' }}
								justifyContent={'center'}
								gap={{ base: 0, md: 2 }}
								textAlign={'start'}
							>
								<Text fontSize={'2xl'} fontWeight={'bold'}>{user.displayName}</Text>
								<Text fontSize={'lg'} fontWeight={'bold'} color={'gray.500'}>({user.decryptedEmail})</Text>
							</Flex>
							<Flex
								alignItems={'center'}
								justifyContent={'center'}
								flexDir={'row'}
								gap={4}
							>
								<Divider orientation={'vertical'} color={'red'} height={'50px'} />
								<HStack spacing={2}>
									<Tooltip label={currentUser?.isDev ? (user.isDev ? 'Developers cannot be managed.' : user.isBoardsAdmin ? 'Manage board admin.' : 'Manage user.') : (user.isDev ? 'You cannot manage developers.' : user.isBoardsAdmin ? 'You cannot manage other admins.' : 'Manage user.')} aria-label='Manage user.'>
										<IconButton
											variant={'ghost'}
											rounded={'full'}
											bg={'alpha100'}
											icon={<FaCog />}
											aria-label={'Manage'}
											alignItems={'center'}
											justifyContent={'center'}
											_hover={{ bg: 'alpha300' }}
											onClick={() => {
												setManageUser(user);
												setModalType('update');
											}}
											colorScheme={user.isDev ? 'red' : user.isBoardsAdmin ? 'orange' : 'blue'}
											isDisabled={user.isDev ? true : currentUser?.isDev ? false : !!user.isBoardsAdmin}
											_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
										/>
									</Tooltip>
								</HStack>
							</Flex>
						</Flex>
					)) : (
						<Flex
							rounded={'lg'}
							bg={'alpha100'}
							p={4}
							w={'100%'}
							transition={'all 0.3s ease'}
							alignItems={'center'}
							justifyContent={'center'}
						>
							<Text fontSize={'2xl'} fontWeight={'bold'}>No users.</Text>
						</Flex>
					)}
				</VStack>

				<ManageUser
					isOpen={!!manageUser && modalType === 'update'}
					onClose={() => setManageUser(null)}
					fetcher={fetcher}
					userData={manageUser}
					allBoards={allBoards}
					currentUserDev={currentUser?.isDev || false}
				/>
			</Box>
		</VStack>
	);
}

export type ManageUserProps = {
	isOpen: boolean;
	onClose: () => void;
	fetcher: FetcherWithComponents<unknown>;
	userData: GetUsersOutput & { decryptedEmail: string; } | null;
	allBoards: { label: string; options: { value: string; label: string }[] }[];
	currentUserDev: boolean;
};

export function ManageUser({ isOpen, onClose, fetcher, userData, allBoards, currentUserDev }: ManageUserProps) {
	const [isBoardsAdmin, setIsBoardsAdmin] = useState(userData?.isBoardsAdmin || false);
	const [selectedPermissions, setSelectedPermissions] = useState<Permissions[]>([]);
	const { colorMode } = useColorMode();

	useEffect(() => {
		if (isOpen && userData) {
			setIsBoardsAdmin(userData.isBoardsAdmin);
			setSelectedPermissions(userData.boardPermissions);
		} else {
			setIsBoardsAdmin(false);
			setSelectedPermissions([]);
		}
	}, [isOpen, userData]);

	const handlePermissionChange = useCallback((boardId: string, permissionType: BoardPermissionType | null) => {
		setSelectedPermissions((prev) => {
			if (!permissionType) return prev.filter((p) => p.boardId !== boardId);
			const existing = prev.find((p) => p.boardId === boardId);
			if (existing) {
				return prev.map((p) => p.boardId === boardId ? { ...p, permissionType } : p);
			}
			return [...prev, { boardId, permissionType }];
		});
	}, []);

	const boardOptions = allBoards.flatMap((category) =>
		category.options.map((board) => ({
			label: `${category.label} - ${board.label}`,
			value: board.value,
		})),
	);

	const selectedBoards = selectedPermissions.map((p) => {
		const board = boardOptions.find((b) => b.value === p.boardId);
		return {
			value: p.boardId,
			label: `${board?.label} (${p.permissionType === 'Write' ? 'W' : 'R'})`,
		};
	});

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='3xl' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method='post'>
					<ModalHeader>Manage User</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<VisuallyHiddenInput onChange={() => { }} name='type' value='updateUser' />
						<VisuallyHiddenInput onChange={() => { }} name='userId' value={userData?.id} />
						<VisuallyHiddenInput onChange={() => { }} name='isBoardsAdmin' value={isBoardsAdmin.toString()} />
						<VisuallyHiddenInput onChange={() => { }} name='boards' value={JSON.stringify(selectedPermissions)} />

						<Flex direction='column' gap={2}>
							<Input type='text' isReadOnly value={`${userData?.displayName} (${userData?.decryptedEmail})`}/>

							<Divider mt={2} />

							<Box flex={1}>
								<Text fontWeight='bold' mb={2}>Select Boards:</Text>
								<Select
									isMulti
									placeholder='Choose boards to manage'
									options={boardOptions}
									value={selectedBoards}
									isDisabled={userData?.isBoardsAdmin || userData?.isDev}
									onChange={(selected) => {
										const ids = selected.map((s) => s.value);
										const current = selectedPermissions.filter((p) => ids.includes(p.boardId));
										const added = ids
											.filter((id) => !current.find((p) => p.boardId === id))
											.map((id) => ({ boardId: id, permissionType: 'Read' as BoardPermissionType }));

										setSelectedPermissions([...current, ...added]);
									}}
								/>
							</Box>

							{selectedPermissions.length > 0 && (
								<Box flex={1}>
									<Text fontWeight='bold' mb={2}>Board Permissions:</Text>

									<Flex direction='column' gap={1}>
										<HStack spacing={1} wrap='wrap'>
											{selectedPermissions.map((perm) => {
												const fullLabel = boardOptions.find((b) => b.value === perm.boardId)?.label || perm.boardId;
												return (
													<Button
														size='xs'
														key={perm.boardId}
														isDisabled={userData?.isBoardsAdmin || userData?.isDev}
														colorScheme={perm.permissionType === 'Read' ? 'green' : 'orange'}
														onClick={() => handlePermissionChange(perm.boardId, perm.permissionType === 'Read' ? 'Write' : 'Read')}
													>
														{fullLabel} ({perm.permissionType === 'Write' ? 'W' : 'R'})
													</Button>
												);
											})}
										</HStack>
									</Flex>
								</Box>
							)}

							<Divider mt={1} />

							<Checkbox
								mb={2}
								id='isBoardsAdmin'
								colorScheme='orange'
								isChecked={isBoardsAdmin}
								isDisabled={!currentUserDev}
								onChange={(e) => setIsBoardsAdmin(e.target.checked)}
							>
								Boards Admin
							</Checkbox>
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
							colorScheme='blue'
							type='submit'
						>
							Save
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}


