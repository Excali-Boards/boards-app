import { Box, Button, Divider, FormControl, FormLabel, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, VStack, useColorMode, useToast } from '@chakra-ui/react';
import { getIpHeaders, makeResObject, makeResponse } from '~/utils/functions.server';
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { FaFolderOpen, FaPlus } from 'react-icons/fa';
import CardList from '~/components/layout/CardList';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { RootContext } from '~/components/Context';
import { WebReturnType } from '~/other/types';
import { useCallback, useContext, useState } from 'react';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';
import type { BoardType } from '@excali-boards/boards-api-client';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');
	const headers = getIpHeaders(request);
	if (!headers) throw makeResponse(null, 'Failed to get client IP.');
	const result = await api?.boards.getPersonalBoards({ auth: token, headers });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to load personal boards.');
	const groups = await api?.groups.getAllSorted({ auth: token, headers });
	if (!groups || 'error' in groups) throw makeResponse(groups, 'Failed to load board destinations.');
	return { personal: result.data, allResources: groups.data };
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');
	const headers = getIpHeaders(request);
	if (!headers) return makeResObject(null, 'Failed to get client IP.');
	const data = await request.formData();
	const type = data.get('type');
	if (type === 'createBoard') {
		const result = await api?.boards.createPersonalBoard({ auth: token, headers, body: {
			name: String(data.get('name') || ''), type: String(data.get('boardType') || 'Excalidraw') as BoardType,
			categoryId: String(data.get('categoryId') || '') || undefined,
		} });
		return makeResObject(result, 'Failed to create personal board.');
	}
	if (type === 'createCategory') {
		const result = await api?.boards.createPersonalCategory({ auth: token, headers, body: { name: String(data.get('name') || '') } });
		return makeResObject(result, 'Failed to create category.');
	}
	if (type === 'moveBoard') {
		const result = await api?.boards.moveBoard({ auth: token, headers,
			groupId: String(data.get('groupId') || ''), categoryId: String(data.get('categoryId') || ''), boardId: String(data.get('boardId') || ''),
			body: { targetCategoryId: String(data.get('targetCategoryId') || '') },
		});
		return makeResObject(result, 'Failed to move board.');
	}
	return { status: 400, error: 'Invalid request.' };
};

export default function PersonalBoards() {
	const { personal, allResources } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};
	const [modal, setModal] = useState<'board' | 'category' | 'move' | null>(null);
	const [moving, setMoving] = useState<{ boardId: string; groupId: string; categoryId: string } | null>(null);
	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();
	useFetcherResponse(fetcher, toast, () => { setModal(null); setMoving(null); });
	const owners = personal && 'owners' in personal ? personal.owners : personal ? [personal] : [];
	const current = personal && 'owners' in personal ? personal.owners.find((owner) => owner.owner.userId === user?.userId) : personal;
	const categoryOptions = current?.categories.map((category) => ({ label: category.name, value: category.id })) || [];
	const destinationOptions = allResources.filter((group) => !group.isPersonal).flatMap((group) => group.categories.map((category) => ({ label: `${group.name} / ${category.name}`, value: category.id })));
	const create = useCallback((form: HTMLFormElement) => fetcher.submit(new FormData(form), { method: 'post' }), [fetcher]);

	return <VStack w='100%' align='center' px={4} spacing={8} mt={{ base: 8, md: 16 }}>
		<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }}>
			<MenuBar name='Personal Boards' description='Your private workspace. Invite people and manage access from each board.' customButtons={[
				{ type: 'normal', label: 'New board', icon: <FaPlus />, onClick: () => setModal('board'), tooltip: 'Create a personal board' },
				...(current ? [{ type: 'link' as const, label: 'Manage categories', icon: <FaFolderOpen />, to: `/groups/${current.id}`, tooltip: 'Organize categories' }] : []),
			]} />
			{owners.map((owner) => <Box key={owner.id} mt={8}>
				{owner.boards.length > 0 && <><Divider mb={3} /><CardList noWhat='boards for this user' cards={owner.boards.map((board) => ({
					id: board.id, name: board.name, sizeBytes: board.totalSizeBytes, url: `/groups/${owner.id}/${board.categoryId}/${board.id}`, permsUrl: `/permissions/${owner.id}/${board.categoryId}/${board.id}`, hasPerms: true, editorMode: true,
					onMove: () => { setMoving({ boardId: board.id, groupId: owner.id, categoryId: board.categoryId }); setModal('move'); },
				}))} /></>}
				{owner.categories.map((category) => <Box key={category.id} mt={8}>
					<Divider mb={3} /><Box fontWeight='bold' fontSize='lg' mb={3}>{category.name}</Box>
					<CardList noWhat='boards in this category' cards={category.boards.map((board) => ({
						id: board.id, name: board.name, sizeBytes: board.totalSizeBytes, url: `/groups/${owner.id}/${category.id}/${board.id}`, permsUrl: `/permissions/${owner.id}/${category.id}/${board.id}`, hasPerms: true, editorMode: true,
						onMove: () => { setMoving({ boardId: board.id, groupId: owner.id, categoryId: category.id }); setModal('move'); },
					}))} />
				</Box>)}
			</Box>)}
			{!owners.length && <Box mt={8}>Create your first board to start your personal workspace.</Box>}
		</Box>
		<PersonalModal type={modal} categories={categoryOptions} destinations={destinationOptions} groupId={current?.id} moving={moving} onClose={() => { setModal(null); setMoving(null); }} onSubmit={create} />
		{current && <Button variant='ghost' onClick={() => setModal('category')}>Create category</Button>}
	</VStack>;
}

function PersonalModal({ type, categories, destinations, groupId, moving, onClose, onSubmit }: { type: 'board' | 'category' | 'move' | null; categories: { label: string; value: string }[]; destinations: { label: string; value: string }[]; groupId?: string; moving: { boardId: string; groupId: string; categoryId: string } | null; onClose: () => void; onSubmit: (form: HTMLFormElement) => void; }) {
	const { colorMode } = useColorMode();
	const [categoryId, setCategoryId] = useState<string | null>(null);
	if (!type) return null;
	const isMove = type === 'move';
	return <Modal isOpen onClose={onClose} isCentered><ModalOverlay /><ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'}><form onSubmit={(event) => { event.preventDefault(); onSubmit(event.currentTarget); }}><ModalHeader>{type === 'board' ? 'Create personal board' : type === 'category' ? 'Create category' : 'Move board'}</ModalHeader><ModalCloseButton /><ModalBody><VStack spacing={4}><input type='hidden' name='type' value={isMove ? 'moveBoard' : type === 'board' ? 'createBoard' : 'createCategory'} />{(groupId || moving?.groupId) && <input type='hidden' name='groupId' value={moving?.groupId || groupId} />}{moving && <><input type='hidden' name='boardId' value={moving.boardId} /><input type='hidden' name='categoryId' value={moving.categoryId} /></>}{!isMove && <FormControl isRequired><FormLabel>Name</FormLabel><Input name='name' autoFocus maxLength={100} /></FormControl>}{isMove && <FormControl isRequired><FormLabel>Move to</FormLabel><Select name='targetCategoryId' options={destinations} defaultValue={null} /></FormControl>}{type === 'board' && <><FormControl><FormLabel>Category</FormLabel><Select name='categoryId' options={categories} defaultValue={null} onChange={(value) => setCategoryId(value?.value || null)} /></FormControl><input type='hidden' name='categoryId' value={categoryId || ''} /><FormControl><FormLabel>Board type</FormLabel><Select name='boardType' options={[{ label: 'Excalidraw', value: 'Excalidraw' }, { label: 'tldraw', value: 'Tldraw' }]} defaultValue={{ label: 'Excalidraw', value: 'Excalidraw' }} /></FormControl></>}</VStack></ModalBody><ModalFooter><Button mr={2} onClick={onClose}>Cancel</Button><Button colorScheme='blue' type='submit' isDisabled={isMove && !destinations.length}>{isMove ? 'Move' : 'Create'}</Button></ModalFooter></form></ModalContent></Modal>;
}
