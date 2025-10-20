import { VStack, Box, Flex, Text, Avatar, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, useColorMode, Badge, HStack, Divider, useToast } from '@chakra-ui/react';
import { FaClipboard, FaEye, FaFolder, FaLock, FaQuestionCircle, FaTrash, FaUsers } from 'react-icons/fa';
import { makeResObject, makeResponse, securityUtils } from '~/utils/functions.server';
import { firstToUpperCase, getGrantInfo, getRoleColor } from '~/other/utils';
import { GrantedEntry, PermUser } from '@excali-boards/boards-api-client';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { SearchBar } from '~/components/layout/SearchBar';
import { useCallback, useMemo, useState } from 'react';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { WebReturnType } from '~/other/types';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBUsers = await api?.admin.getUsers({ auth: token });
	if (!DBUsers || 'error' in DBUsers) throw makeResponse(DBUsers, 'Failed to get users.');

	const userIds = DBUsers.data.map((user) => user.userId);
	const allPermissions = await api?.permissions.viewAllPermissions({ auth: token, userIds });
	if (!allPermissions || 'error' in allPermissions) throw makeResponse(allPermissions, 'Failed to get user permissions.');

	return {
		userPermissions: allPermissions.data,
		allUsers: DBUsers.data.map((user) => ({
			...user,
			decryptedEmail: securityUtils.decrypt(user.email),
		})).sort((a, b) => {
			if (a.isDev && !b.isDev) return -1;
			if (!a.isDev && b.isDev) return 1;
			return a.displayName.localeCompare(b.displayName);
		}),
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'revokePermission': {
			const userId = formData.get('userId') as string;
			const resourceType = formData.get('resourceType') as string;
			const resourceId = formData.get('resourceId') as string;

			if (!userId || !resourceType || !resourceId) {
				return { status: 400, error: 'Missing required fields.' };
			}

			const result = await api?.permissions.revokePermissions({
				auth: token,
				body: { userId, resourceType: resourceType as 'group' | 'category' | 'board', resourceId },
			});

			return makeResObject(result, 'Failed to revoke permission.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function AdminUsers() {
	const { allUsers, userPermissions } = useLoaderData<typeof loader>();

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const [selectedUser, setSelectedUser] = useState<typeof allUsers[0] | null>(null);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setSelectedUser(null));

	const finalUsers = useMemo(() => {
		if (!dbcSearch) return allUsers;
		return allUsers.filter((b) => dbcSearch ? b.displayName.includes(dbcSearch) || b.email.includes(dbcSearch) : true);
	}, [allUsers, dbcSearch]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Manage Users'}
					description={'View all registered users.'}
					goBackPath='/admin'
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
							gap={4}
							w={'100%'}
							_hover={{ bg: 'alpha200' }}
							transition={'all 0.3s ease'}
							alignItems={'center'}
							wordBreak={'break-word'}
							justifyContent={'space-between'}
						>
							<Flex gap={4} alignItems={'center'} flex={1}>
								<Avatar
									size={{ base: 'md', md: 'lg' }}
									name={user.displayName}
									src={user.avatarUrl || '/logo.webp'}
								/>

								<Flex
									justifyContent={'center'}
									alignItems={'start'}
									flexDir={'column'}
								>
									<Text
										fontSize={{ base: 'lg', md: '2xl' }}
										fontWeight={'bold'}
									>
										{user.displayName}
									</Text>

									<Flex gap={{ base: 0, md: 2 }} alignItems={'start'} flexDir={{ base: 'column', md: 'row' }}>
										<Text
											fontSize={{ base: 'sm', md: 'lg' }}
											fontWeight={'bold'}
											color={'gray.500'}
										>
											({user.userId})
										</Text>
										<Text
											fontSize={{ base: 'sm', md: 'lg' }}
											fontWeight={'bold'}
											color={'gray.500'}
										>
											({user.decryptedEmail})
										</Text>
									</Flex>
								</Flex>
							</Flex>

							<Flex
								alignItems={'center'}
								justifyContent={'center'}
								flexDir={'row'}
								gap={4}
							>
								<Divider orientation={'vertical'} color={'red'} height={'50px'} />

								<HStack spacing={2}>
									<IconButton
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										icon={<FaEye />}
										onClick={() => setSelectedUser(user)}
										aria-label='View Permissions'
										_hover={{ bg: 'alpha300' }}
										_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									/>
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
			</Box>

			{selectedUser && (
				<UserPermissionsModal
					isOpen={selectedUser !== null}
					onClose={() => setSelectedUser(null)}
					userData={userPermissions[selectedUser!.userId]!}
					onRevoke={(entry) => {
						fetcher.submit({
							type: 'revokePermission',
							userId: selectedUser.userId,
							resourceType: entry.type,
							resourceId: entry.resourceId,
						}, { method: 'post' });
					}}
				/>
			)}
		</VStack>
	);
}

export type UserPermissionsModalProps = {
	isOpen: boolean;
	onClose: () => void;
	userData: PermUser;
	onRevoke: (entry: GrantedEntry) => void;
};

function UserPermissionsModal({ isOpen, onClose, userData, onRevoke }: UserPermissionsModalProps) {
	const { colorMode } = useColorMode();

	const getResourceTypeIcon = useCallback((type: string) => {
		switch (type) {
			case 'group': return <FaUsers />;
			case 'category': return <FaFolder />;
			case 'board': return <FaClipboard />;
			default: return <FaQuestionCircle />;
		}
	}, []);

	const explicitPermissions = useMemo(() => {
		return userData.permissions.filter((perm) => perm.grantType === 'explicit');
	}, [userData.permissions]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>
					<HStack spacing={3}>
						<Avatar
							size='sm'
							name={userData.displayName}
							src={userData.avatarUrl || '/logo.webp'}
						/>

						<Text fontSize='lg' fontWeight='bold'>
							{userData.displayName.endsWith('s') ? `${userData.displayName}'` : `${userData.displayName}'s`} Permissions
						</Text>
					</HStack>
				</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					{explicitPermissions.length === 0 ? (
						<Flex flexDir='column' gap={2} py={4} align='center'>
							<Text fontSize='lg' fontWeight='medium' color='gray.600'>
								<FaLock />
							</Text>
							<Text fontSize='lg' fontWeight='medium' color='gray.600'>
								No permissions found
							</Text>
							<Text fontSize='sm' color='gray.500'>
								This user has no permissions assigned.
							</Text>
						</Flex>
					) : (
						<VStack spacing={2} align='stretch'>
							{explicitPermissions.map((perm, index) => (
								<Flex
									key={index}
									rounded='lg'
									bg='alpha100'
									py={3}
									px={4}
									w='100%'
									_hover={{ bg: 'alpha200' }}
									transition='all 0.3s ease'
									alignItems='center'
									justifyContent='space-between'
								>
									<VStack align='flex-start' flex={1} spacing={1}>
										<HStack spacing={2}>
											<Text fontSize='lg'>
												{getResourceTypeIcon(perm.type)}
											</Text>
											<Text fontSize='lg' fontWeight='semibold'>
												{perm.basedOnResourceName}
											</Text>
										</HStack>
										<Text fontSize='sm' color='gray.500'>
											{firstToUpperCase(perm.type)} • {perm.resourceId}
										</Text>
										{perm.grantType === 'implicit' && (
											<Text fontSize='xs' color='blue.500'>
												Inherited from {perm.basedOnType}: {perm.basedOnResourceName}
											</Text>
										)}
									</VStack>
									<Flex alignItems='center' gap={4}>
										<HStack spacing={2}>
											<Badge
												px={2} py={1}
												color='white'
												borderRadius='full'
												textTransform='none'
												bg={getRoleColor(perm.role)}
											>
												{perm.role}
											</Badge>

											<Badge
												px={2} py={1}
												color='white'
												borderRadius='full'
												textTransform='none'
												bg={getGrantInfo(perm.grantType).color}
											>
												{getGrantInfo(perm.grantType).label}
											</Badge>

											<Divider orientation='vertical' height='30px' />

											<IconButton
												size='sm'
												colorScheme='gray'
												aria-label='Remove permission'
												icon={<FaTrash />}
												onClick={() => onRevoke(perm)}
											/>
										</HStack>
									</Flex>
								</Flex>
							))}
						</VStack>
					)}
				</ModalBody>
				<ModalFooter>
					<Button colorScheme='gray' onClick={onClose} w='100%'>
						Close
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
