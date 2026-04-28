import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput, Text } from '@chakra-ui/react';
import { camelCaseToTitle, canInviteAndPermit, canManage, formatRelativeTime, parseOptionalNonNegativeInteger, splitCamelCaseWords, validateParams } from '~/other/utils';
import { getIpHeaders, makeResObject, makeResponse } from '~/utils/functions.server';
import { BoardType } from '@excali-boards/boards-api-client/prisma/generated/client';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { SearchBar } from '~/components/layout/SearchBar';
import { NoticeCard } from '~/components/other/Notice';
import CardList from '~/components/layout/CardList';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import configServer from '~/utils/config.server';
import { FaPlus, FaTools } from 'react-icons/fa';
import { WebReturnType } from '~/other/types';
import Select from '~/components/Select';
import { api } from '~/utils/web.server';

export type MoveTargetCategory = {
	id: string;
	name: string;
	groupId: string;
	groupName: string;
};

export type MoveTargetGroup = {
	id: string;
	name: string;
	categories: MoveTargetCategory[];
};

export type MoveTargetsResponse = WebReturnType<string> & {
	moveTargets?: MoveTargetGroup[];
};

export type ModalOpen = 'createBoard' | 'updateBoard' | 'moveBoard' | 'deleteBoard' | 'forceDeleteBoard' | null;
export type ManageBoardProps = {
	isOpen: boolean;
	onClose: () => void;

	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;

	defaultName?: string;
	boardId?: string;
	currentCategoryId: string;
	moveTargets: MoveTargetGroup[];
	isMoveTargetsLoading: boolean;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBCategory = await api?.categories.getCategory({ auth: token, categoryId, groupId, headers: ipHeaders });
	if (!DBCategory || 'error' in DBCategory) throw makeResponse(DBCategory, 'Failed to get category.');

	return {
		...DBCategory.data,
		showSearches: configServer.showSearches,
		boards: DBCategory.data.boards.map((board) => ({
			...board,
			scheduledForDeletionText: board.scheduledForDeletion ? formatRelativeTime(new Date(board.scheduledForDeletion), true) : null,
		})),
	};
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) return makeResObject(null, 'Failed to get client IP.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'newBoard': {
			const boardName = formData.get('boardName') as string;
			const boardType = formData.get('boardType') as BoardType;

			const result = await api?.categories.createBoardInCategory({ auth: token, categoryId, groupId, body: { name: boardName, type: boardType }, headers: ipHeaders });
			return makeResObject(result, 'Failed to create board.');
		}
		case 'updateBoard': {
			const boardId = formData.get('boardId') as string;
			const boardName = formData.get('boardName') as string;
			if (!boardId || !boardName) return { status: 400, error: 'Invalid board name.' };

			const result = await api?.boards.updateBoard({ auth: token, boardId, groupId, categoryId, body: { name: boardName }, headers: ipHeaders });
			return makeResObject(result, 'Failed to update board.');
		}
		case 'moveBoard': {
			const boardId = formData.get('boardId') as string;
			const targetCategoryId = formData.get('targetCategoryId') as string;
			const targetIndex = parseOptionalNonNegativeInteger(formData.get('targetIndex'));

			if (!boardId) return { status: 400, error: 'Invalid board id.' };
			if (!targetCategoryId) return { status: 400, error: 'Invalid target category id.' };
			if (targetCategoryId === categoryId) return { status: 400, error: 'Target category must be different from current category.' };
			if (targetIndex === null) return { status: 400, error: 'Target index must be a non-negative integer.' };

			const result = await api?.boards.moveBoard({
				auth: token,
				groupId,
				categoryId,
				boardId,
				body: {
					targetCategoryId,
					...(targetIndex !== undefined ? { targetIndex } : {}),
				},
				headers: ipHeaders,
			});

			if (!result || 'error' in result) return makeResObject(result, 'Failed to move board.');
			return { status: 200, data: 'Board moved successfully.' };
		}
		case 'getMoveTargets': {
			const DBResources = await api?.groups.getAllSorted({ auth: token, headers: ipHeaders });
			if (!DBResources || 'error' in DBResources) return makeResObject(DBResources, 'Failed to load move targets.');

			return {
				status: 200,
				data: 'Move targets loaded.',
				moveTargets: DBResources.data.map((targetGroup) => ({
					id: targetGroup.id,
					name: targetGroup.name,
					categories: targetGroup.categories.map((targetCategory) => ({
						id: targetCategory.id,
						name: targetCategory.name,
						groupId: targetGroup.id,
						groupName: targetGroup.name,
					})),
				})),
			};
		}
		case 'reorderBoards': {
			const boards = (formData.get('boards') as string)?.split(',') || [];
			if (!boards || boards.length && boards.some((board) => typeof board !== 'string')) return { status: 400, error: 'Invalid boards.' };

			const result = await api?.categories.reorderBoardsInCategory({ auth: token, categoryId, groupId, body: boards, headers: ipHeaders });
			return makeResObject(result, 'Failed to reorder boards.');
		}
		case 'deleteBoard': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.boards.scheduleBoardDeletion({ auth: token, boardId, groupId, categoryId, headers: ipHeaders });
			return makeResObject(result, 'Failed to delete board.');
		}
		case 'forceDeleteBoard': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.boards.forceDeleteBoard({ auth: token, boardId, groupId, categoryId, headers: ipHeaders });
			return makeResObject(result, 'Failed to permanently delete board.');
		}
		case 'cancelDeletion': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.boards.cancelBoardDeletion({ auth: token, boardId, groupId, categoryId, headers: ipHeaders });
			return makeResObject(result, 'Failed to cancel board deletion.');
		}
		case 'initializeFlashcards': {
			const boardId = formData.get('boardId') as string;
			if (!boardId) return { status: 400, error: 'Invalid board id.' };

			const result = await api?.flashcards.initializeDeck({ auth: token, boardId, groupId, categoryId, headers: ipHeaders });
			return makeResObject(result, 'Failed to initialize flashcards for board.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Boards() {
	const { group, category, boards, showSearches } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};

	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);
	const [boardId, setBoardId] = useState<string | null>(null);

	const [revertKey, setRevertKey] = useState(0);
	const [editorMode, setEditorMode] = useState(false);
	const [tempBoards, setTempBoards] = useState<string[]>([]);

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const fetcher = useFetcher<WebReturnType<string>>();
	const moveTargetsFetcher = useFetcher<MoveTargetsResponse>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setModalOpen(null));

	useEffect(() => {
		if (!moveTargetsFetcher.data || moveTargetsFetcher.data.status === 200) return;

		toast({
			title: moveTargetsFetcher.data.error,
			status: 'error',
			variant: 'subtle',
			position: 'bottom-right',
			isClosable: true,
		});
	}, [moveTargetsFetcher.data, toast]);

	const canManageAnyBoard = useMemo(() => boards.some((b) => canManage(b.accessLevel, user?.isDev)), [boards, user?.isDev]);
	const canCreateBoard = useMemo(() => canManage(category.accessLevel, user?.isDev), [category.accessLevel, user?.isDev]);

	const finalBoards = useMemo(() => {
		const normalizedSearch = dbcSearch.trim().toLowerCase();
		if (!normalizedSearch) return boards;
		return boards.filter((board) => board.name.toLowerCase().includes(normalizedSearch));
	}, [boards, dbcSearch]);

	const selectedBoard = useMemo(
		() => boards.find((board) => board.id === boardId) ?? null,
		[boards, boardId],
	);

	const moveTargets = useMemo(() => {
		if (!moveTargetsFetcher.data || moveTargetsFetcher.data.status !== 200) return [];
		return moveTargetsFetcher.data.moveTargets || [];
	}, [moveTargetsFetcher.data]);
	const hasMoveTargetsLoaded = moveTargetsFetcher.data?.status === 200;
	const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);

	const handleSave = useCallback(() => {
		fetcher.submit({ type: 'reorderBoards', boards: tempBoards.join(',') }, { method: 'post' });
		setTempBoards([]);
	}, [fetcher, tempBoards]);

	const handleOpenMoveBoard = useCallback((id: string) => {
		setBoardId(id);
		setModalOpen('moveBoard');
		if (!hasMoveTargetsLoaded && moveTargetsFetcher.state === 'idle') {
			moveTargetsFetcher.submit({ type: 'getMoveTargets' }, { method: 'post' });
		}
	}, [hasMoveTargetsLoaded, moveTargetsFetcher]);

	const handleCancelDeletion = useCallback((id: string) => {
		const board = boardsById.get(id);
		if (!board?.scheduledForDeletion) return;

		fetcher.submit({ type: 'cancelDeletion', boardId: id }, { method: 'post' });
	}, [boardsById, fetcher]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Boards in category: ${category.name}`}
					description={'List of all boards that are currently available to you in this category.'}
					goBackPath={`/groups/${group.id}`}
					customButtons={[
						...(canManageAnyBoard ? [{
							type: 'normal',
							label: 'Manage Boards',
							icon: <FaTools />,
							isDisabled: boards.length === 0,
							onClick: () => setEditorMode(!editorMode),
							isLoading: fetcher.state === 'loading',
							tooltip: 'Manage boards',
							isActive: editorMode,
						}] as const : []),
						...(canCreateBoard ? [{
							type: 'normal',
							label: 'Create Board',
							icon: <FaPlus />,
							onClick: () => setModalOpen('createBoard'),
							isLoading: fetcher.state === 'loading',
							tooltip: 'Create board',
						}] as const : []),
					]}
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'boards'} id='boards' dividerMY={4} isShown={showSearches} />

				<CardList
					key={revertKey}
					noWhat='boards'
					onDelete={editorMode ? (id) => {
						setModalOpen('deleteBoard');
						setBoardId(id);
					} : undefined}
					onForceDelete={editorMode && user?.isDev ? (id) => {
						setModalOpen('forceDeleteBoard');
						setBoardId(id);
					} : undefined}
					onEdit={editorMode ? (id) => {
						setModalOpen('updateBoard');
						setBoardId(id);
					} : undefined}
					onMove={editorMode ? handleOpenMoveBoard : undefined}
					onReorder={editorMode && canCreateBoard ? (orderedIds) => {
						setTempBoards(orderedIds);
					} : undefined}
					onFlashCreate={editorMode ? (id) => {
						fetcher.submit({ type: 'initializeFlashcards', boardId: id }, { method: 'post' });
					} : undefined}
					onCancelDeletion={editorMode ? handleCancelDeletion : undefined}
					cards={finalBoards.map((board) => ({
						id: board.id,
						editorMode,
						sizeBytes: board.totalSizeBytes,
						hasPerms: canManage(board.accessLevel, user?.isDev),
						url: `/groups/${group.id}/${category.id}/${board.id}`,
						name: board.name.charAt(0).toUpperCase() + board.name.slice(1),

						flashExists: board.hasFlashcards,
						flashUrl: `/flashcards/${group.id}/${category.id}/${board.id}`,
						isScheduledForDeletionText: board.scheduledForDeletionText || undefined,
						isScheduledForDeletion: board.scheduledForDeletion ? new Date(board.scheduledForDeletion) : undefined,
						permsUrl: canManage(board.accessLevel, user?.isDev) ? `/permissions/${group.id}/${category.id}/${board.id}` : undefined,
						analyticsUrl: canInviteAndPermit(board.accessLevel, user?.isDev) ? `/analytics/${group.id}/${category.id}/${board.id}` : undefined,
					}))}
				/>

				<ManageBoard
					fetcher={fetcher}
					isOpen={modalOpen !== null}
					boardId={boardId || undefined}
					type={modalOpen || 'createBoard'}
					onClose={() => setModalOpen(null)}
					defaultName={selectedBoard?.name || ''}
					currentCategoryId={category.id}
					moveTargets={moveTargets}
					isMoveTargetsLoading={moveTargetsFetcher.state !== 'idle'}
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

export function ManageBoard({
	isOpen,
	onClose,
	type,
	fetcher,
	defaultName,
	boardId,
	currentCategoryId,
	moveTargets,
	isMoveTargetsLoading,
}: ManageBoardProps) {
	const { colorMode } = useColorMode();
	const modalTitle = useMemo(() => camelCaseToTitle(type), [type]);
	const submitLabel = useMemo(() => splitCamelCaseWords(type)[0] || 'Submit', [type]);

	const availableCategories = useMemo(
		() => moveTargets
			.flatMap((group) => group.categories)
			.filter((category) => category.id !== currentCategoryId),
		[moveTargets, currentCategoryId],
	);
	const targetCategoryOptions = useMemo(
		() => availableCategories.map((category) => ({
			label: `${category.groupName} -> ${category.name}`,
			value: category.id,
		})),
		[availableCategories],
	);

	const [targetCategoryId, setTargetCategoryId] = useState('');

	useEffect(() => {
		if (type !== 'moveBoard') return;

		if (availableCategories.length === 0) {
			setTargetCategoryId('');
			return;
		}

		setTargetCategoryId((prev) => (
			prev && availableCategories.some((category) => category.id === prev)
				? prev
				: availableCategories[0]!.id
		));
	}, [type, availableCategories]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method={'post'}>
					<ModalHeader>
						{modalTitle}
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
											options={['Excalidraw', 'Tldraw'].map((boardType) => ({ label: boardType, value: boardType }))}
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

							{type === 'moveBoard' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='moveBoard' />
									<VisuallyHiddenInput onChange={() => { }} name='boardId' value={boardId || ''} />

									<Box>
										<Text mb={2} fontSize='sm' fontWeight='semibold'>Target Category</Text>
										<Select
											id='targetCategoryId'
											name='targetCategoryId'
											value={targetCategoryOptions.find((option) => option.value === targetCategoryId) || null}
											onChange={(option) => setTargetCategoryId(option?.value || '')}
											placeholder='Select target category'
											options={targetCategoryOptions}
											isDisabled={isMoveTargetsLoading || availableCategories.length === 0}
										/>
									</Box>

									<Box>
										<Text mb={2} fontSize='sm' fontWeight='semibold'>Target Index (optional)</Text>
										<Input
											id='targetIndex'
											name='targetIndex'
											type='number'
											min={0}
											step={1}
											placeholder='Leave empty to append at end'
										/>
									</Box>

									{isMoveTargetsLoading && <Text fontSize='sm'>Loading move targets...</Text>}
									{!isMoveTargetsLoading && availableCategories.length === 0 && (
										<Text fontSize='sm'>No valid target categories available for this board.</Text>
									)}
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

							{type === 'forceDeleteBoard' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='forceDeleteBoard' />
									<VisuallyHiddenInput onChange={() => { }} name='boardId' value={boardId || ''} />
									Are you sure you want to permanently delete this board? <br />
									This action cannot be undone. All data will be lost.
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
							isDisabled={type === 'moveBoard' && (isMoveTargetsLoading || !targetCategoryId)}
							colorScheme={type === 'deleteBoard' || type === 'forceDeleteBoard' ? 'red' : 'blue'}
							type='submit'
						>
							{submitLabel}
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}
