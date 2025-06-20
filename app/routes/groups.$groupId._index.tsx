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

		{ title: `Boards - ${data.group.name}` },
		{ name: 'description', content: 'List of all categories that are currently available to you in this group.' },

		{ property: 'og:site_name', content: 'Boards' },
		{ property: 'og:title', content: `Boards - ${data.group.name}` },
		{ property: 'og:description', content: 'List of all categories that are currently available to you in this group.' },
		{ property: 'og:image', content: '/banner.webp' },

		{ name: 'twitter:title', content: `Boards - ${data.group.name}` },
		{ name: 'twitter:description', content: 'List of all categories that are currently available to you in this group.' },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:image', content: '/banner.webp' },

		{ name: 'theme-color', content: themeColor },
	];
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const groupInfo = await api?.groups.getGroup({ auth: token, groupId });
	if (!groupInfo || 'error' in groupInfo) throw makeResponse(groupInfo, 'Failed to get group.');

	return groupInfo.data;
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

			const DBCategory = await api?.groups.createCategoryInGroup({ auth: token, groupId, body: { name: categoryName } });
			return makeResObject(DBCategory, 'Failed to create category.');
		}
		case 'updateCategory': {
			const categoryId = formData.get('categoryId') as string;
			const categoryName = formData.get('categoryName') as string;
			if (!categoryId || !categoryName) return { status: 400, error: 'Invalid category name.' };

			const DBCategory = await api?.categories.updateCategory({ auth: token, categoryId, groupId, body: { name: categoryName } });
			return makeResObject(DBCategory, 'Failed to update category.');
		}
		case 'reorderCategories': {
			const categories = (formData.get('categories') as string)?.split(',') || [];
			if (!categories || categories.length && categories.some((category) => typeof category !== 'string')) return { status: 400, error: 'Invalid categories.' };

			const DBReorderedCategories = await api?.groups.reorderCategoriesInGroup({ auth: token, groupId, body: categories });
			return makeResObject(DBReorderedCategories, 'Failed to reorder categories.');
		}
		case 'deleteCategory': {
			const categoryId = formData.get('categoryId') as string;
			if (!categoryId) return { status: 400, error: 'Invalid category id.' };

			const DBDeleteCategory = await api?.categories.deleteCategory({ auth: token, categoryId, groupId });
			return makeResObject(DBDeleteCategory, 'Failed to delete category.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Categories() {
	const { isAdmin, group, categories } = useLoaderData<typeof loader>();
	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);
	const [categoryId, setCategoryId] = useState<string | null>(null);

	const [tempCategories, setTempCategories] = useState<string[]>([]);
	const [didShowAlert, setDidShowAlert] = useState(false);
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

	useEffect(() => {
		if (tempCategories.length > 0 && !didShowAlert) {
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
	}, [didShowAlert, handleSave, tempCategories, toast]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Categories in group: ${group.name}`}
					description={'List of all categories that are currently available to you in this group.'}
					goBackPath='/groups'
					customButtons={isAdmin ? [{
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

				<ListOrGrid
					noWhat='categories'
					onDelete={isAdmin && editorMode ? (index) => {
						setModalOpen('deleteCategory');
						setCategoryId(finalCategories[index].id);
					} : undefined}
					onEdit={isAdmin && editorMode ? (index) => {
						setModalOpen('updateCategory');
						setCategoryId(finalCategories[index].id);
					} : undefined}
					onReorder={isAdmin && editorMode ? (orderedIds) => {
						setTempCategories(orderedIds);
					} : undefined}
					cards={finalCategories.map((c) => ({
						id: c.id,
						sizeBytes: c.sizeBytes,
						isDeleteDisabled: c.boards > 0,
						url: `/groups/${group.id}/${c.id}`,
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
											minLength={3}
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
											minLength={3}
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
