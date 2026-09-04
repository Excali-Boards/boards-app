import { ActionFunctionArgs, LoaderFunctionArgs, json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { Box, Button, Divider, FormControl, FormLabel, Input, Select, Text, VStack } from '@chakra-ui/react';
import { authenticator } from '~/utils/auth.server';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { validateParams } from '~/other/utils';
import { api } from '~/utils/web.server';
import type { AdminS3Board } from './admin.boards._index';
import MenuBar from '~/components/layout/MenuBar';
import { lazy, Suspense } from 'react';

const RawExcalidraw = lazy(async () => {
	const module = await import('@excalidraw/excalidraw');
	return { default: module.Excalidraw };
});
const RawTldrawImage = lazy(async () => {
	const module = await import('tldraw');
	return { default: module.TldrawImage };
});

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { boardId } = validateParams(params, ['boardId']);
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const result = await api?.request<AdminS3Board[]>({ method: 'GET', auth: token, headers: ipHeaders, endpoint: '/admin/boards' });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to resolve board.');

	const storedBoard = result.data.find((entry) => entry.boardId === boardId);
	if (!storedBoard) throw makeResponse(null, 'Board file not found in S3.');

	const { board } = storedBoard;
	if (!board) {
		const [groups, contentResult] = await Promise.all([
			api?.groups.getAllSorted({ auth: token, headers: ipHeaders }),
			api?.request<{ boardId: string; type: 'Excalidraw' | 'Tldraw'; content: unknown }>({ method: 'GET', auth: token, headers: ipHeaders, endpoint: `/admin/boards/${boardId}/content` }),
		]);
		if (!groups || 'error' in groups) throw makeResponse(groups, 'Failed to retrieve categories.');
		if (!contentResult || 'error' in contentResult) throw makeResponse(contentResult, 'Failed to load board content.');

		return {
			boardId,
			content: contentResult.data,
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

	const result = await api?.request<{ boardId: string }>({
		method: 'POST', auth: token, headers: ipHeaders, endpoint: `/admin/boards/${boardId}/resolve`,
		body: { name, categoryId, type },
	});
	if (!result || 'error' in result) return json({ error: 'Failed to link board.' }, { status: 400 });

	return redirect(`/admin/boards/${boardId}`);
};

export default function AdminBoard() {
	const { boardId, categories, content } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }}>
				<MenuBar name='Link S3 Board' description='Add this board file to a category.' goBackPath='/admin/boards' />
				<Divider my={4} />
				<Form method='post'>
					<VStack align='stretch' spacing={4} bg='alpha100' rounded='lg' p={6}>
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
						<Button type='submit' colorScheme='blue'>Link board</Button>
					</VStack>
				</Form>
				<Box mt={6} h='70vh' minH='500px' rounded='lg' overflow='hidden' bg='white'>
					<Suspense fallback={<Text p={6}>Loading board preview…</Text>}>
						{content.type === 'Excalidraw' ? (
							<RawExcalidraw viewModeEnabled initialData={{ elements: content.content as never }} />
						) : (
							<RawTldrawImage snapshot={content.content as never} />
						)}
					</Suspense>
				</Box>
			</Box>
		</VStack>
	);
}
