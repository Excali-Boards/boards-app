import { VStack, Box, Divider, Flex, Text, HStack, Avatar, AvatarGroup, Tooltip } from '@chakra-ui/react';
import { makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import { IconLinkButton } from '~/components/Button';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { useLoaderData } from '@remix-run/react';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const roomsData = await api?.admin.getActiveRooms({ auth: token });
	if (!roomsData || !('data' in roomsData)) throw new Response(null, { status: 500, statusText: 'Failed to fetch rooms data.' });

	const allGroups = await api?.groups.getAllSorted({ auth: token });
	if (!allGroups || 'error' in allGroups) throw makeResponse(allGroups, 'Failed to get boards.');

	const allBoards = allGroups.data.list.flatMap((group) => group.categories.flatMap((category) => category.boards.map((board) => ({
		board: board,
		group: group,
		category: category,
	}))));

	return {
		rooms: roomsData.data.map((room) => {
			const boardData = allBoards.find((b) => b.board.id === room.boardId);

			return {
				boardId: room.boardId,
				groupId: boardData?.group.id || 'Unknown',
				categoryId: boardData?.category.id || 'Unknown',
				name: boardData?.board.name || 'Unknown',
				elements: room.elements,
				collaborators: room.collaborators.map((collab) => ({
					id: collab.id,
					username: collab.username,
					avatarUrl: collab.avatarUrl,
				})),
			};
		}) || [],
	};
};

export default function AdminRooms() {
	const { rooms } = useLoaderData<typeof loader>();

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Manage Rooms'}
					description={'Manage live rooms and their settings.'}
					goBackPath='/admin'
					hideSortButton
				/>

				<Divider my={4} />

				<VStack w={'100%'} spacing={2}>
					{rooms.length ? rooms.map((b, i) => (
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
								<Text fontSize={'2xl'} fontWeight={'bold'}>{b.name}</Text>
								<Text fontSize={'lg'} fontWeight={'bold'} color={'gray.500'}>({b.elements} element{b.elements === 1 ? '' : 's'})</Text>
							</Flex>
							<Flex
								alignItems={'center'}
								justifyContent={'center'}
								flexDir={'row'}
								gap={4}
							>
								<Tooltip key={i} label={`Collaborators: ${b.collaborators.map((collab) => collab.username).join(', ')}`} placement='top'>
									<AvatarGroup size={'sm'} max={5}>
										{b.collaborators.map((collab, i) => (
											<Avatar
												key={i}
												name={collab.username}
												src={collab.avatarUrl || undefined}
												cursor={'pointer'}
												bg={'alpha300'}
												loading='lazy'
												size={'sm'}
											/>
										))}
									</AvatarGroup>
								</Tooltip>
								<Divider orientation={'vertical'} color={'red'} height={'50px'} />
								<HStack spacing={2}>
									<IconLinkButton
										to={`/groups/${b.groupId}/${b.categoryId}/${b.boardId}`}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										icon={<FaLink />}
										aria-label={'Manage'}
										alignItems={'center'}
										justifyContent={'center'}
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
							<Text fontSize={'2xl'} fontWeight={'bold'}>No active rooms.</Text>
						</Flex>
					)}
				</VStack>
			</Box>
		</VStack>
	);
}
