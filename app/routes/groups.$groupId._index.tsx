import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput, Text } from '@chakra-ui/react';
import { getIpHeaders, makeResObject, makeResponse } from '~/utils/functions.server';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { camelCaseToTitle, canInviteAndPermit, canManage, parseOptionalNonNegativeInteger, splitCamelCaseWords, validateParams } from '~/other/utils';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { FaPlus, FaTools, FaCalendarAlt } from 'react-icons/fa';
import { SearchBar } from '~/components/layout/SearchBar';
import { NoticeCard } from '~/components/other/Notice';
import CardList from '~/components/layout/CardList';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import Select from '~/components/Select';
import configServer from '~/utils/config.server';
import { WebReturnType } from '~/other/types';
import { api } from '~/utils/web.server';

export type MoveTargetCategory = {
	id: string;
	name: string;
};

export type MoveTargetGroup = {
	id: string;
	name: string;
	categories: MoveTargetCategory[];
};

export type MoveTargetsResponse = WebReturnType<string> & {
	moveTargets?: MoveTargetGroup[];
};

export type ModalOpen = 'createCategory' | 'updateCategory' | 'moveCategory' | 'deleteCategory' | null;
export type ManageCategoryProps = {
	isOpen: boolean;
	onClose: () => void;

	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;

	defaultName?: string;
	categoryId?: string;
	currentGroupId: string;
	moveTargets: MoveTargetGroup[];
	isMoveTargetsLoading: boolean;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBGroup = await api?.groups.getGroup({ auth: token, groupId, headers: ipHeaders });
	if (!DBGroup || 'error' in DBGroup) throw makeResponse(DBGroup, 'Failed to get group.');

	return {
		group: DBGroup.data.group,
		categories: DBGroup.data.categories,
		showSearches: configServer.showSearches,
	};
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) return makeResObject(null, 'Failed to get client IP.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'newCategory': {
			const categoryName = formData.get('categoryName') as string;

			const result = await api?.groups.createCategoryInGroup({ auth: token, groupId, body: { name: categoryName }, headers: ipHeaders });
			return makeResObject(result, 'Failed to create category.');
		}
		case 'updateCategory': {
			const categoryId = formData.get('categoryId') as string;
			const categoryName = formData.get('categoryName') as string;
			if (!categoryId || !categoryName) return { status: 400, error: 'Invalid category name.' };

			const result = await api?.categories.updateCategory({ auth: token, categoryId, groupId, body: { name: categoryName }, headers: ipHeaders });
			return makeResObject(result, 'Failed to update category.');
		}
		case 'moveCategory': {
			const categoryId = formData.get('categoryId') as string;
			const targetGroupId = formData.get('targetGroupId') as string;
			const targetIndex = parseOptionalNonNegativeInteger(formData.get('targetIndex'));

			if (!categoryId) return { status: 400, error: 'Invalid category id.' };
			if (!targetGroupId) return { status: 400, error: 'Invalid target group id.' };
			if (targetGroupId === groupId) return { status: 400, error: 'Target group must be different from current group.' };
			if (targetIndex === null) return { status: 400, error: 'Target index must be a non-negative integer.' };

			const result = await api?.categories.moveCategory({
				auth: token,
				groupId,
				categoryId,
				body: {
					targetGroupId,
					...(targetIndex !== undefined ? { targetIndex } : {}),
				},
				headers: ipHeaders,
			});

			if (!result || 'error' in result) return makeResObject(result, 'Failed to move category.');
			return { status: 200, data: 'Category moved successfully.' };
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
					})),
				})),
			};
		}
		case 'reorderCategories': {
			const categories = (formData.get('categories') as string)?.split(',') || [];
			if (!categories || categories.length && categories.some((category) => typeof category !== 'string')) return { status: 400, error: 'Invalid categories.' };

			const result = await api?.groups.reorderCategoriesInGroup({ auth: token, groupId, body: categories, headers: ipHeaders });
			return makeResObject(result, 'Failed to reorder categories.');
		}
		case 'deleteCategory': {
			const categoryId = formData.get('categoryId') as string;
			if (!categoryId) return { status: 400, error: 'Invalid category id.' };

			const result = await api?.categories.deleteCategory({ auth: token, categoryId, groupId, headers: ipHeaders });
			return makeResObject(result, 'Failed to delete category.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Categories() {
	const { group, categories, showSearches } = useLoaderData<typeof loader>();
	const { user, setCanInvite } = useContext(RootContext) || {};

	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);

	const [revertKey, setRevertKey] = useState(0);
	const [editorMode, setEditorMode] = useState(false);
	const [tempCategories, setTempCategories] = useState<string[]>([]);

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

	const finalCategories = useMemo(() => {
		const normalizedSearch = dbcSearch.trim().toLowerCase();
		if (!normalizedSearch) return categories;
		return categories.filter((category) => category.name.toLowerCase().includes(normalizedSearch));
	}, [categories, dbcSearch]);

	const selectedCategory = useMemo(
		() => categories.find((category) => category.id === categoryId) ?? null,
		[categories, categoryId],
	);

	const moveTargets = useMemo(() => {
		if (!moveTargetsFetcher.data || moveTargetsFetcher.data.status !== 200) return [];
		return moveTargetsFetcher.data.moveTargets || [];
	}, [moveTargetsFetcher.data]);
	const hasMoveTargetsLoaded = moveTargetsFetcher.data?.status === 200;

	const handleSave = useCallback(() => {
		fetcher.submit({ type: 'reorderCategories', categories: tempCategories.join(',') }, { method: 'post' });
		setTempCategories([]);
	}, [fetcher, tempCategories]);

	const handleMoveCategory = useCallback((id: string) => {
		setCategoryId(id);
		setModalOpen('moveCategory');
		if (!hasMoveTargetsLoaded && moveTargetsFetcher.state === 'idle') {
			moveTargetsFetcher.submit({ type: 'getMoveTargets' }, { method: 'post' });
		}
	}, [hasMoveTargetsLoaded, moveTargetsFetcher]);

	const canManageAnyCategory = useMemo(() => categories.some((c) => canManage(c.accessLevel, user?.isDev)), [categories, user?.isDev]);
	const canCreateCategory = useMemo(() => canManage(group.accessLevel, user?.isDev), [group.accessLevel, user?.isDev]);
	useEffect(() => setCanInvite?.(canManageAnyCategory), [canManageAnyCategory, setCanInvite]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Categories in group: ${group.name}`}
					description={'List of all categories that are currently available to you in this group.'}
					goBackPath='/groups'
					customButtons={[{
						type: 'link',
						label: 'Calendar',
						icon: <FaCalendarAlt />,
						to: `/groups/${group.id}/calendar`,
						tooltip: 'View group calendar',
						reloadDocument: true,
					}, ...(canManageAnyCategory ? [{
						type: 'normal',
						label: 'Manage Categories',
						icon: <FaTools />,
						isDisabled: categories.length === 0,
						onClick: () => setEditorMode(!editorMode),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Manage categories',
						isActive: editorMode,
					}] as const : []), ...(canCreateCategory ? [{
						type: 'normal',
						label: 'Create Category',
						icon: <FaPlus />,
						onClick: () => setModalOpen('createCategory'),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Create category',
					}] as const : [])]}
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'categories'} id='categories' dividerMY={4} isShown={showSearches} />

				<CardList
					key={revertKey}
					noWhat='categories'
					onDelete={editorMode ? (id) => {
						setModalOpen('deleteCategory');
						setCategoryId(id);
					} : undefined}
					onEdit={editorMode ? (id) => {
						setModalOpen('updateCategory');
						setCategoryId(id);
					} : undefined}
					onMove={editorMode ? handleMoveCategory : undefined}
					onReorder={editorMode && canCreateCategory ? (orderedIds) => {
						setTempCategories(orderedIds);
					} : undefined}
					cards={finalCategories.map((c) => ({
						id: c.id,
						editorMode,
						sizeBytes: c.totalSizeBytes,
						isDeleteDisabled: c.boards > 0,
						url: `/groups/${group.id}/${c.id}`,
						hasPerms: canManage(c.accessLevel, user?.isDev),
						name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
						permsUrl: canInviteAndPermit(c.accessLevel, user?.isDev) ? `/permissions/${group.id}/${c.id}` : undefined,
						analyticsUrl: canManage(c.accessLevel, user?.isDev) ? `/analytics/${group.id}/${c.id}` : undefined,
					}))}
				/>

				<ManageCategory
					isOpen={modalOpen !== null}
					onClose={() => setModalOpen(null)}
					type={modalOpen || 'createCategory'}
					fetcher={fetcher}
					defaultName={selectedCategory?.name || ''}
					categoryId={categoryId || undefined}
					currentGroupId={group.id}
					moveTargets={moveTargets}
					isMoveTargetsLoading={moveTargetsFetcher.state !== 'idle'}
				/>

				<NoticeCard
					isFloating={true}
					useIconButtons={true}
					isVisible={tempCategories.length > 0}
					variant='warning'
					message='Save your changes or cancel to revert.'
					confirmText='Save Changes'
					cancelText='Cancel'
					onConfirm={handleSave}
					onCancel={() => {
						setTempCategories([]);
						setRevertKey((prev) => prev + 1);
					}}
				/>
			</Box>
		</VStack>
	);
}

export function ManageCategory({
	isOpen,
	onClose,
	type,
	fetcher,
	defaultName,
	categoryId,
	currentGroupId,
	moveTargets,
	isMoveTargetsLoading,
}: ManageCategoryProps) {
	const { colorMode } = useColorMode();
	const modalTitle = useMemo(() => camelCaseToTitle(type), [type]);
	const submitLabel = useMemo(() => splitCamelCaseWords(type)[0] || 'Submit', [type]);
	const availableGroups = useMemo(
		() => moveTargets.filter((targetGroup) => targetGroup.id !== currentGroupId),
		[moveTargets, currentGroupId],
	);
	const targetGroupOptions = useMemo(
		() => availableGroups.map((group) => ({ label: group.name, value: group.id })),
		[availableGroups],
	);

	const [targetGroupId, setTargetGroupId] = useState('');

	useEffect(() => {
		if (type !== 'moveCategory') return;

		if (availableGroups.length === 0) {
			setTargetGroupId('');
			return;
		}

		setTargetGroupId((prev) => (
			prev && availableGroups.some((group) => group.id === prev)
				? prev
				: availableGroups[0]!.id
		));
	}, [type, availableGroups]);

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
							{type === 'createCategory' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='newCategory' />
									<Box flex={1}>
										<Input
											id='categoryName'
											name='categoryName'
											placeholder='Category Name'
											defaultValue={defaultName || ''}
											maxLength={50}
											minLength={1}
											autoFocus
										/>
									</Box>
								</>
							)}

							{type === 'updateCategory' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='updateCategory' />
									<VisuallyHiddenInput onChange={() => { }} name='categoryId' value={categoryId || ''} />

									<Box flex={1}>
										<Input
											id='categoryName'
											name='categoryName'
											placeholder='Category Name'
											defaultValue={defaultName || ''}
											maxLength={50}
											minLength={1}
											autoFocus
										/>
									</Box>
								</>
							)}

							{type === 'moveCategory' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='moveCategory' />
									<VisuallyHiddenInput onChange={() => { }} name='categoryId' value={categoryId || ''} />

									<Box>
										<Text mb={2} fontSize='sm' fontWeight='semibold'>Target Group</Text>
										<Select
											id='targetGroupId'
											name='targetGroupId'
											value={targetGroupOptions.find((option) => option.value === targetGroupId) || null}
											onChange={(option) => setTargetGroupId(option?.value || '')}
											placeholder='Select target group'
											options={targetGroupOptions}
											isDisabled={isMoveTargetsLoading || availableGroups.length === 0}
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
									{!isMoveTargetsLoading && availableGroups.length === 0 && (
										<Text fontSize='sm'>No valid target groups available for this category.</Text>
									)}
								</>
							)}

							{type === 'deleteCategory' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='deleteCategory' />
									<VisuallyHiddenInput onChange={() => { }} name='categoryId' value={categoryId || ''} />
									Are you sure you want to delete this category? <br />
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
							isDisabled={type === 'moveCategory' && (isMoveTargetsLoading || !targetGroupId)}
							colorScheme={type === 'deleteCategory' ? 'red' : 'blue'}
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
