import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput } from '@chakra-ui/react';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { LoaderFunctionArgs, ActionFunctionArgs, MetaArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { themeColor, WebReturnType } from '~/other/types';
import { SearchBar } from '~/components/layout/SearchBar';
import ListOrGrid from '~/components/layout/ListOrGrid';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { FaPlus, FaTools } from 'react-icons/fa';
import { validateParams } from '~/other/utils';
import { defaultMeta } from '~/other/keywords';
import { api } from '~/utils/web.server';

export function meta({ data }: MetaArgs<typeof loader>) {
	if (!data) return defaultMeta;

	return [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },

		{ title: `Boards - ${data.group.name} - ${data.category.name}` },
		{ name: 'description', content: 'List of all boards that are currently available to you in this category.' },

		{ property: 'og:site_name', content: 'Boards' },
		{ property: 'og:title', content: `Boards - ${data.group.name} - ${data.category.name}` },
		{ property: 'og:description', content: 'List of all boards that are currently available to you in this category.' },
		{ property: 'og:image', content: '/banner.webp' },

		{ name: 'twitter:title', content: `Boards - ${data.group.name} - ${data.category.name}` },
		{ name: 'twitter:description', content: 'List of all boards that are currently available to you in this category.' },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:image', content: '/banner.webp' },

		{ name: 'theme-color', content: themeColor },
	];
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const boardInfo = await api?.categories.getCategory({ auth: token, categoryId, groupId });
	if (!boardInfo || 'error' in boardInfo) throw makeResponse(boardInfo, 'Failed to get category.');

	return boardInfo.data;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'newBoard': {
			const boardName = formData.get('boardName') as string;

			const DBBoard = await api?.categories.createBoardInCategory({ auth: token, categoryId, groupId, body: { name: boardName } });
			return makeResObject(DBBoard, 'Failed to create board.');
		}
		case 'updateBoard': {
			const boardId = formData.get('boardId') as string;
			const boardName = formData.get('boardName') as string;
			if (!boardId || !boardName) return { status: 400, error: 'Invalid board name.' };

			const DBBoard = await api?.boards.updateBoard({ auth: token, boardId, groupId, categoryId, body: { name: boardName } });
			return makeResObject(DBBoard, 'Failed to update board.');
		}
		case 'reorderBoards': {
			const boards = (formData.get('boards') as string)?.split(',') || [];
			if (!boards || boards.length && boards.some((board) => typeof board !== 'string')) return { status: 400, error: 'Invalid boards.' };

			const DBReorderedBoards = await api?.categories.reorderBoardsInCategory({ auth: token, categoryId, groupId, body: boards });
			return makeResObject(DBReorderedBoards, 'Failed to reorder boards.');
		}
		case 'deleteBoard': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const DBDeleteBoard = await api?.boards.scheduleBoardDeletion({ auth: token, boardId, groupId, categoryId });
			return makeResObject(DBDeleteBoard, 'Failed to delete board.');
		}
		case 'cancelDeletion': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const DBCancelDeletion = await api?.boards.cancelBoardDeletion({ auth: token, boardId, groupId, categoryId });
			return makeResObject(DBCancelDeletion, 'Failed to cancel board deletion.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Boards() {
	const { isAdmin, group, category, boards } = useLoaderData<typeof loader>();
	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);
	const [boardId, setBoardId] = useState<string | null>(null);

	const [tempBoards, setTempBoards] = useState<string[]>([]);
	const [didShowAlert, setDidShowAlert] = useState(false);
	const [editorMode, setEditorMode] = useState(false);

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setModalOpen(null));

	const finalBoards = useMemo(() => {
		if (!dbcSearch) return boards;
		return boards.filter((b) => dbcSearch ? b.name.includes(dbcSearch) : true);
	}, [boards, dbcSearch, fetcher.state]); // eslint-disable-line

	const handleSave = useCallback(() => {
		fetcher.submit({ type: 'reorderBoards', boards: boards.join(',') }, { method: 'post' });
		setTempBoards([]);
	}, [fetcher, boards]);

	useEffect(() => {
		if (tempBoards.length > 0 && !didShowAlert) {
			setDidShowAlert(true);

			toast({
				title: 'You have unsaved changes.',
				description: 'Dismiss this message to save your changes.',
				status: 'warning',
				duration: null,
				isClosable: true,
				position: 'bottom-right',
				variant: 'subtle',
				onCloseComplete: () => handleSave(),
			});
		}
	}, [didShowAlert, handleSave, tempBoards, toast]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Boards in category ${category.name}`}
					description={'List of all boards that are currently available to you in this category.'}
					customButtons={isAdmin ? [{
						type: 'normal',
						label: 'Manage boards.',
						icon: <FaTools />,
						isDisabled: boards.length === 0,
						onClick: () => setEditorMode(!editorMode),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Manage boards.',
						isActive: editorMode,
					}, {
						type: 'normal',
						label: 'Create board.',
						icon: <FaPlus />,
						onClick: () => setModalOpen('createBoard'),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Create board.',
					}] : []}
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'boards'} id='boards' dividerMY={4} />

				<ListOrGrid
					noWhat='boards'
					onDelete={isAdmin && editorMode ? (index) => {
						setModalOpen('deleteBoard');
						setBoardId(finalBoards[index].id);
					} : undefined}
					onEdit={isAdmin && editorMode ? (index) => {
						setModalOpen('updateBoard');
						setBoardId(finalBoards[index].id);
					} : undefined}
					onReorder={isAdmin && editorMode ? (orderedIds) => {
						setTempBoards(orderedIds);
					} : undefined}
					onCancelDeletion={isAdmin && editorMode ? (index) => {
						const board = finalBoards[index];
						if (!board.scheduledForDeletion) return;

						fetcher.submit({ type: 'cancelDeletion', boardId: board.id }, { method: 'post' });
					} : undefined}
					cards={finalBoards.map((b) => ({
						id: b.id,
						url: `/groups/${group.id}/${category.id}/${b.id}`,
						name: b.name.charAt(0).toUpperCase() + b.name.slice(1),
						isScheduledForDeletion: b.scheduledForDeletion ? new Date(b.scheduledForDeletion) : undefined,
					}))}
				/>

				<ManageBoard
					fetcher={fetcher}
					isOpen={modalOpen !== null}
					boardId={boardId || undefined}
					type={modalOpen || 'createBoard'}
					onClose={() => setModalOpen(null)}
					defaultName={finalBoards.find((g) => g.id === boardId)?.name || ''}
				/>
			</Box>
		</VStack>
	);
}

export type ModalOpen = 'createBoard' | 'updateBoard' | 'deleteBoard' | null;
export type ManageBoardProps = {
	isOpen: boolean;
	onClose: () => void;

	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;

	defaultName?: string;
	boardId?: string;
};

export function ManageBoard({ isOpen, onClose, type, fetcher, defaultName, boardId }: ManageBoardProps) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={useColorMode().colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method={'post'}>
					<ModalHeader>
						{type.split(/(?=[A-Z])/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
					</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<Flex
							flexDir='column'
							flexWrap='wrap'
							gap={4}
						>
							{type === 'createBoard' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='newBoard' />
									<Box flex={1}>
										<Input
											id='boardName'
											name='boardName'
											placeholder='Board Name'
											defaultValue={defaultName || ''}
											maxLength={50}
											minLength={3}
											autoFocus
										/>
									</Box>
								</>
							)}

							{type === 'updateBoard' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='updateBoard' />
									<VisuallyHiddenInput onChange={() => { }} name='boardId' value={boardId || ''} />

									<Box flex={1}>
										<Input
											id='boardName'
											name='boardName'
											placeholder='Board Name'
											defaultValue={defaultName || ''}
											maxLength={50}
											minLength={3}
											autoFocus
										/>
									</Box>
								</>
							)}

							{type === 'deleteBoard' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='deleteBoard' />
									<VisuallyHiddenInput onChange={() => { }} name='boardId' value={boardId || ''} />
									Are you sure you want to delete this board? <br />
									This action cannot be undone.
								</>
							)}
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
							{type.split(/(?=[A-Z])/).map((word) => word.charAt(0).toUpperCase() + word.slice(1))[0]}
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}
