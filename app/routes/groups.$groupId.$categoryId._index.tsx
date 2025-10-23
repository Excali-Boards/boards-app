import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput, Text, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { BoardType } from '@excali-boards/boards-api-client/prisma/generated/client';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { SearchBar } from '~/components/layout/SearchBar';
import { canManage, validateParams } from '~/other/utils';
import { NoticeCard } from '~/components/other/Notice';
import CardList from '~/components/layout/CardList';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { FaPlus, FaTools } from 'react-icons/fa';
import { WebReturnType } from '~/other/types';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBCategory = await api?.categories.getCategory({ auth: token, categoryId, groupId });
	if (!DBCategory || 'error' in DBCategory) throw makeResponse(DBCategory, 'Failed to get category.');

	return DBCategory.data;
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
			const boardType = formData.get('boardType') as BoardType;

			const result = await api?.categories.createBoardInCategory({ auth: token, categoryId, groupId, body: { name: boardName, type: boardType } });
			return makeResObject(result, 'Failed to create board.');
		}
		case 'updateBoard': {
			const boardId = formData.get('boardId') as string;
			const boardName = formData.get('boardName') as string;
			if (!boardId || !boardName) return { status: 400, error: 'Invalid board name.' };

			const result = await api?.boards.updateBoard({ auth: token, boardId, groupId, categoryId, body: { name: boardName } });
			return makeResObject(result, 'Failed to update board.');
		}
		case 'reorderBoards': {
			const boards = (formData.get('boards') as string)?.split(',') || [];
			if (!boards || boards.length && boards.some((board) => typeof board !== 'string')) return { status: 400, error: 'Invalid boards.' };

			const result = await api?.categories.reorderBoardsInCategory({ auth: token, categoryId, groupId, body: boards });
			return makeResObject(result, 'Failed to reorder boards.');
		}
		case 'deleteBoard': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.boards.scheduleBoardDeletion({ auth: token, boardId, groupId, categoryId });
			return makeResObject(result, 'Failed to delete board.');
		}
		case 'cancelDeletion': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.boards.cancelBoardDeletion({ auth: token, boardId, groupId, categoryId });
			return makeResObject(result, 'Failed to cancel board deletion.');
		}
		case 'initializeFlashcards': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.flashcards.initializeDeck({ auth: token, boardId, groupId, categoryId });
			return makeResObject(result, 'Failed to initialize flashcards for board.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Boards() {
	const { group, category, boards } = useLoaderData<typeof loader>();
	const { user, setCanInvite } = useContext(RootContext) || {};

	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);
	const [boardId, setBoardId] = useState<string | null>(null);

	const [revertKey, setRevertKey] = useState(0);
	const [editorMode, setEditorMode] = useState(false);
	const [tempBoards, setTempBoards] = useState<string[]>([]);

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
		fetcher.submit({ type: 'reorderBoards', boards: tempBoards.join(',') }, { method: 'post' });
		setTempBoards([]);
	}, [fetcher, tempBoards]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Boards in category: ${category.name}`}
					description={'List of all boards that are currently available to you in this category.'}
					goBackPath={`/groups/${group.id}`}
					customButtons={user?.isDev || canManage(category.accessLevel) ? [{
						type: 'normal',
						label: 'Manage boards',
						icon: <FaTools />,
						isDisabled: boards.length === 0,
						onClick: () => setEditorMode(!editorMode),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Manage boards',
						isActive: editorMode,
					}, {
						type: 'normal',
						label: 'Create board',
						icon: <FaPlus />,
						onClick: () => setModalOpen('createBoard'),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Create board.',
					}] : []}
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'boards'} id='boards' dividerMY={4} />

				<CardList
					key={revertKey}
					noWhat='boards'
					onDelete={editorMode ? (index) => {
						setModalOpen('deleteBoard');
						setBoardId(finalBoards[index]!.id);
					} : undefined}
					onEdit={editorMode ? (index) => {
						setModalOpen('updateBoard');
						setBoardId(finalBoards[index]!.id);
					} : undefined}
					onReorder={editorMode ? (orderedIds) => {
						setTempBoards(orderedIds);
					} : undefined}
					onFlashCreate={editorMode ? (index) => {
						const board = finalBoards[index];
						if (!board) return;

						fetcher.submit({ type: 'initializeFlashcards', boardId: board.id }, { method: 'post' });
					} : undefined}
					onCancelDeletion={editorMode ? (index) => {
						const board = finalBoards[index];
						if (!board?.scheduledForDeletion) return;

						fetcher.submit({ type: 'cancelDeletion', boardId: board.id }, { method: 'post' });
					} : undefined}
					cards={finalBoards.map((b) => ({
						id: b.id,
						editorMode,
						sizeBytes: b.totalSizeBytes,
						flashExists: b.hasFlashcards,
						url: `/groups/${group.id}/${category.id}/${b.id}`,
						name: b.name.charAt(0).toUpperCase() + b.name.slice(1),
						flashUrl: `/flashcards/${group.id}/${category.id}/${b.id}`,
						isScheduledForDeletion: b.scheduledForDeletion ? new Date(b.scheduledForDeletion) : undefined,
						permsUrl: (user?.isDev || b.accessLevel === 'admin') ? `/permissions/${group.id}/${category.id}/${b.id}` : undefined,
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

				<NoticeCard
					isFloating={true}
					useIconButtons={true}
					isVisible={tempBoards.length > 0}
					variant='warning'
					message='Save your changes or cancel to revert.'
					confirmText='Save Changes'
					cancelText='Cancel'
					onConfirm={handleSave}
					onCancel={() => {
						setTempBoards([]);
						setRevertKey((prev) => prev + 1);
					}}
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
	const { colorMode } = useColorMode();

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
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
											minLength={1}
											autoFocus
										/>
									</Box>
									<Box flex={1}>
										<Select
											id='boardType'
											name='boardType'
											placeholder='Board Type'
											options={['Excalidraw', 'Tldraw'].map((type) => ({ label: type, value: type }))}
											defaultValue={{ label: 'Excalidraw', value: 'Excalidraw' }}
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
											minLength={1}
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
							flex={1}
							colorScheme='gray'
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							flex={1}
							isLoading={fetcher.state === 'loading' || fetcher.state === 'submitting'}
							colorScheme={type === 'deleteBoard' ? 'red' : 'blue'}
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
