import { Badge, Box, Divider, Flex, LinkBox, LinkOverlay, Text, VStack } from '@chakra-ui/react';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { Link, useLoaderData } from '@remix-run/react';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { api } from '~/utils/web.server';

export type AdminS3Board = {
	boardId: string;
	board: {
		id: string;
		name: string;
		type: 'Excalidraw' | 'Tldraw';
		groupId: string;
		groupName: string;
		categoryId: string;
		categoryName: string;
		isPersonal: boolean;
		userId: string | null;
	} | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const result = await api?.admin.getS3Boards({ auth: token, headers: ipHeaders });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to retrieve board files from S3.');

	return { boards: result.data };
};

export default function AdminBoards() {
	const { boards } = useLoaderData<typeof loader>();

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }}>
				<MenuBar name='S3 Boards' description={`${boards.length} board file${boards.length === 1 ? '' : 's'} found in S3.`} goBackPath='/admin' />
				<Divider my={4} />
				<VStack w='100%' spacing={2}>
					{boards.length ? boards.map(({ boardId, board }) => (
						<LinkBox key={boardId} as={Flex} w='100%' rounded='lg' bg='alpha100' p={4} alignItems='center' justifyContent='space-between' _hover={{ bg: 'alpha200' }}>
							<Box minW={0}>
								<LinkOverlay as={Link} to={`/admin/boards/${boardId}`}>
									<Text fontSize='xl' fontWeight='bold' wordBreak='break-word'>{board?.name || 'Unresolved board'}</Text>
								</LinkOverlay>
								{board && <Text color='gray.500' fontSize='sm'>{board.groupName} • {board.categoryName} • {board.type}</Text>}
								<Text color='gray.500' fontSize='sm'>{boardId}</Text>
							</Box>
							<Badge colorScheme={board ? 'green' : 'red'}>{board ? 'Resolved' : 'Unresolved'}</Badge>
						</LinkBox>
					)) : <Text color='gray.500'>No .bin board files found in S3.</Text>}
				</VStack>
			</Box>
		</VStack>
	);
}
