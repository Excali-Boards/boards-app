import { Box, Button, Divider, FormControl, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Select, Text, VStack, useBreakpointValue, useColorMode } from '@chakra-ui/react';
import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { lazy, Suspense, useContext, useState } from 'react';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import configServer from '~/utils/config.server';
import MenuBar from '~/components/layout/MenuBar';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

const ExcalidrawBoard = lazy(async () => {
	const module = await import('~/components/board/Excalidraw');
	return { default: module.ExcalidrawBoard };
});

const TldrawBoard = lazy(async () => {
	const module = await import('~/components/board/Tldraw');
	return { default: module.TldrawBoard };
});

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { boardId } = validateParams(params, ['boardId']);
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const result = await api?.admin.getS3Boards({ auth: token, headers: ipHeaders });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to resolve board.');

	const storedBoard = result.data.find((entry) => entry.boardId === boardId);
	if (!storedBoard) throw makeResponse(null, 'Board file not found in S3.');

	const { board } = storedBoard;
	if (!board) {
		const [groups, contentResult] = await Promise.all([
			api?.groups.getAllSorted({ auth: token, headers: ipHeaders }),
			api?.admin.getS3BoardContent({ auth: token, boardId, headers: ipHeaders }),
		]);
		if (!groups || 'error' in groups) throw makeResponse(groups, 'Failed to retrieve categories.');
		if (!contentResult || 'error' in contentResult) throw makeResponse(contentResult, 'Failed to load board content.');

		return {
			boardId,
			content: contentResult.data,
			webUrl: configServer.baseUrl,
			licenseKey: configServer.tldrawLicense,
			socketUrl: configServer.apiUrl,
			s3Bucket: configServer.s3Bucket,
			s3Url: configServer.s3Url,
			categories: groups.data.flatMap((group) => group.categories.map((category) => ({
				id: category.id,
				name: category.name,
				groupName: group.name,
			}))),
		};
	}

	if (board.isPersonal && board.userId) return redirect(`/personal/${board.userId}/${board.categoryId}/${boardId}`);
	return redirect(`/groups/${board.groupId}/${board.categoryId}/${boardId}`);
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { boardId } = validateParams(params, ['boardId']);
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) return json({ error: 'Failed to get client IP.' }, { status: 400 });

	const formData = await request.formData();
	const name = String(formData.get('name') || '').trim();
	const categoryId = String(formData.get('categoryId') || '');
	const type = String(formData.get('type') || '');
	if (!name || !categoryId || (type !== 'Excalidraw' && type !== 'Tldraw')) return json({ error: 'Name, category, and board type are required.' }, { status: 400 });

	const result = await api?.admin.resolveS3Board({ auth: token, boardId, headers: ipHeaders, body: { name, categoryId, type } });
	if (!result || 'error' in result) return json({ error: 'Failed to link board.' }, { status: 400 });

	return redirect(`/admin/boards/${boardId}`);
};

export default function AdminBoard() {
	const { boardId, categories, content, webUrl, licenseKey, socketUrl, s3Bucket, s3Url } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
	const { user, token, useOppositeColorForBoard } = useContext(RootContext) || {};
	const { colorMode } = useColorMode();
	const isMobile = useBreakpointValue({ base: true, md: false });
	const boardProps = {
		updateCollaborators: () => undefined,
		useOppositeColorForBoard: useOppositeColorForBoard || false,
		colorMode,
		hideCollaborators: true,
		canReallyEdit: false,
		user,
		categoryId: 'unresolved',
		currentUrl: `${webUrl}/admin/boards/${boardId}`,
		isMobile: isMobile || false,
		socketUrl,
		canEdit: false,
		s3Bucket,
		boardId,
		groupId: 'unresolved',
		s3Url,
		token: token || '',
		name: `Unresolved board - ${boardId}`,
		staticMode: true,
		staticContent: content.content,
	};

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }}>
				<MenuBar
					name='Unresolved S3 Board'
					description='Previewing a board file that is not linked to a category.'
					goBackPath='/admin/boards'
					customButtons={[{
						type: 'normal',
						label: 'Link board',
						icon: <FaLink />,
						onClick: () => setIsLinkModalOpen(true),
						tooltip: 'Link board to a category',
					}]}
				/>
				<Divider my={4} />
				<Box h='calc(100vh - 180px)' minH='500px' rounded='lg' overflow='hidden'>
					<Suspense fallback={<Text p={6}>Loading board preview…</Text>}>
		{content.type === 'Excalidraw' ? <ExcalidrawBoard {...boardProps} user={user!} /> : <TldrawBoard {...boardProps} user={user!} licenseKey={licenseKey || undefined} />}
					</Suspense>
				</Box>
				<Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)}>
					<ModalOverlay />
					<ModalContent>
						<ModalHeader>Link board to a category</ModalHeader>
						<ModalCloseButton />
						<Form method='post'>
							<ModalBody>
								<VStack align='stretch' spacing={4}>
									<Text color='gray.500'>S3 board file: {boardId}</Text>
									<FormControl isRequired>
										<FormLabel>Name</FormLabel>
										<Input name='name' placeholder='Board name' autoFocus />
									</FormControl>
									<FormControl isRequired>
										<FormLabel>Category</FormLabel>
										<Select name='categoryId' placeholder='Select a category'>
											{categories.map((category) => <option key={category.id} value={category.id}>{category.groupName} • {category.name}</option>)}
										</Select>
									</FormControl>
									<FormControl isRequired>
										<FormLabel>Board type</FormLabel>
										<Select name='type' defaultValue='Excalidraw'>
											<option value='Excalidraw'>Excalidraw</option>
											<option value='Tldraw'>tldraw</option>
										</Select>
									</FormControl>
									{actionData?.error && <Text color='red.500'>{actionData.error}</Text>}
								</VStack>
							</ModalBody>
							<ModalFooter>
								<Button type='submit' colorScheme='blue'>Link board</Button>
							</ModalFooter>
						</Form>
					</ModalContent>
				</Modal>
			</Box>
		</VStack>
	);
}
