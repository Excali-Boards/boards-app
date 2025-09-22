import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput, Text, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import useFetcherResponse from '~/hooks/useFetcherResponse';
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
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBGroup = await api?.groups.getGroup({ auth: token, groupId });
	if (!DBGroup || 'error' in DBGroup) throw makeResponse(DBGroup, 'Failed to get group.');

	return DBGroup.data;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'newCategory': {
			const categoryName = formData.get('categoryName') as string;

			const result = await api?.groups.createCategoryInGroup({ auth: token, groupId, body: { name: categoryName } });
			return makeResObject(result, 'Failed to create category.');
		}
		case 'updateCategory': {
			const categoryId = formData.get('categoryId') as string;
			const categoryName = formData.get('categoryName') as string;
			if (!categoryId || !categoryName) return { status: 400, error: 'Invalid category name.' };

			const result = await api?.categories.updateCategory({ auth: token, categoryId, groupId, body: { name: categoryName } });
			return makeResObject(result, 'Failed to update category.');
		}
		case 'reorderCategories': {
			const categories = (formData.get('categories') as string)?.split(',') || [];
			if (!categories || categories.length && categories.some((category) => typeof category !== 'string')) return { status: 400, error: 'Invalid categories.' };

			const result = await api?.groups.reorderCategoriesInGroup({ auth: token, groupId, body: categories });
			return makeResObject(result, 'Failed to reorder categories.');
		}
		case 'deleteCategory': {
			const categoryId = formData.get('categoryId') as string;
			if (!categoryId) return { status: 400, error: 'Invalid category id.' };

			const result = await api?.categories.deleteCategory({ auth: token, categoryId, groupId });
			return makeResObject(result, 'Failed to delete category.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Categories() {
	const { group, categories } = useLoaderData<typeof loader>();
	const { user, setCanInvite } = useContext(RootContext) || {};

	const [categoryId, setCategoryId] = useState<string | null>(null);
	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);

	const [tempCategories, setTempCategories] = useState<string[]>([]);
	const [didShowAlert, setDidShowAlert] = useState(false);
	const [revertKey, setRevertKey] = useState(0); // Key to force CardList reset
	const [editorMode, setEditorMode] = useState(false);

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setModalOpen(null));

	const finalCategories = useMemo(() => {
		if (!dbcSearch) return categories;
		return categories.filter((b) => dbcSearch ? b.name.includes(dbcSearch) : true);
	}, [categories, dbcSearch]);

	const handleSave = useCallback(() => {
		fetcher.submit({ type: 'reorderCategories', categories: tempCategories.join(',') }, { method: 'post' });
		setTempCategories([]);
	}, [fetcher, tempCategories]);

	const canManageAnything = useMemo(() => categories.some((c) => c.accessLevel === 'admin'), [categories]);
	useEffect(() => setCanInvite?.(canManageAnything), [canManageAnything, setCanInvite]);

	useEffect(() => {
		if (tempCategories.length > 0) {
			setDidShowAlert(true);
		}
	}, [tempCategories]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Categories in group: ${group.name}`}
					description={'List of all categories that are currently available to you in this group.'}
					goBackPath='/groups'
					customButtons={user?.isDev || canManage(group.accessLevel) ? [{
						type: 'normal',
						label: 'Manage categories.',
						icon: <FaTools />,
						isDisabled: categories.length === 0,
						onClick: () => setEditorMode(!editorMode),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Manage categories.',
						isActive: editorMode,
					}, {
						type: 'normal',
						label: 'Create category.',
						icon: <FaPlus />,
						onClick: () => setModalOpen('createCategory'),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Create category.',
					}] : []}
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'categories'} id='categories' dividerMY={4} />

				<CardList
					key={revertKey} // Force remount when reverting
					noWhat='categories'
					onDelete={editorMode ? (index) => {
						setModalOpen('deleteCategory');
						setCategoryId(finalCategories[index]!.id);
					} : undefined}
					onEdit={editorMode ? (index) => {
						setModalOpen('updateCategory');
						setCategoryId(finalCategories[index]!.id);
					} : undefined}
					onReorder={editorMode ? (orderedIds) => {
						setTempCategories(orderedIds);
					} : undefined}
					cards={finalCategories.map((c) => ({
						id: c.id,
						editorMode,
						canManageAnything,
						sizeBytes: c.totalSizeBytes,
						isDeleteDisabled: c.boards > 0,
						url: `/groups/${group.id}/${c.id}`,
						permsUrl: (user?.isDev || c.accessLevel === 'admin') ? `/permissions/${group.id}/${c.id}` : undefined,
						name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
					}))}
				/>

				<ManageCategory
					isOpen={modalOpen !== null}
					onClose={() => setModalOpen(null)}
					type={modalOpen || 'createCategory'}
					fetcher={fetcher}
					defaultName={finalCategories.find((g) => g.id === categoryId)?.name || ''}
					categoryId={categoryId || undefined}
				/>

				<NoticeCard
					isFloating={true}
					useIconButtons={true}
					isVisible={tempCategories.length > 0}
					variant='warning'
					message='Save your changes or cancel to revert.'
					confirmText='Save Changes'
					cancelText='Cancel'
					onConfirm={() => {
						handleSave();
						setDidShowAlert(false);
					}}
					onCancel={() => {
						setTempCategories([]);
						setDidShowAlert(false);
						setRevertKey(prev => prev + 1);
					}}
				/>
			</Box>
		</VStack>
	);
}

export type ModalOpen = 'createCategory' | 'updateCategory' | 'deleteCategory' | null;
export type ManageCategoryProps = {
	isOpen: boolean;
	onClose: () => void;

	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;

	defaultName?: string;
	categoryId?: string;
};

export function ManageCategory({ isOpen, onClose, type, fetcher, defaultName, categoryId }: ManageCategoryProps) {
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
							colorScheme={type === 'deleteCategory' ? 'red' : 'blue'}
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
