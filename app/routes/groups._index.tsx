import { VStack, Box, useToast, Button, Flex, Input, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, VisuallyHiddenInput, Text, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { FetcherWithComponents, useFetcher, useLoaderData } from '@remix-run/react';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { SearchBar } from '~/components/layout/SearchBar';
import { NoticeCard } from '~/components/other/Notice';
import CardList from '~/components/layout/CardList';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { FaPlus, FaTools } from 'react-icons/fa';
import { WebReturnType } from '~/other/types';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBGroups = await api?.groups.getGroups({ auth: token });
	if (!DBGroups || 'error' in DBGroups) throw makeResponse(DBGroups, 'Failed to get groups.');

	return {
		groups: DBGroups.data,
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'newGroup': {
			const groupName = formData.get('groupName') as string;

			const result = await api?.groups.createGroup({ auth: token, body: { name: groupName } });
			return makeResObject(result, 'Failed to create group.');
		}
		case 'updateGroup': {
			const groupId = formData.get('groupId') as string;
			const groupName = formData.get('groupName') as string;
			if (!groupId || !groupName) return { status: 400, error: 'Invalid group name.' };

			const result = await api?.groups.updateGroup({ auth: token, groupId, body: { name: groupName } });
			return makeResObject(result, 'Failed to update group.');
		}
		case 'reorderGroups': {
			const groups = (formData.get('groups') as string)?.split(',') || [];
			if (!groups || groups.length && groups.some((category) => typeof category !== 'string')) return { status: 400, error: 'Invalid groups.' };

			const result = await api?.groups.reorderGroups({ auth: token, body: groups });
			return makeResObject(result, 'Failed to reorder groups.');
		}
		case 'deleteGroup': {
			const groupId = formData.get('groupId') as string;
			if (!groupId) return { status: 400, error: 'Invalid group id.' };

			const result = await api?.groups.deleteGroup({ auth: token, groupId });
			return makeResObject(result, 'Failed to delete group.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function Groups() {
	const { user, setCanInvite, setShowAllBoards } = useContext(RootContext) || {};
	const { groups } = useLoaderData<typeof loader>();

	const [modalOpen, setModalOpen] = useState<ModalOpen>(null);
	const [groupId, setGroupId] = useState<string | null>(null);

	const [tempGroups, setTempGroups] = useState<string[]>([]);
	const [didShowAlert, setDidShowAlert] = useState(false);
	const [revertKey, setRevertKey] = useState(0);
	const [editorMode, setEditorMode] = useState(false);

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setModalOpen(null));

	const finalGroups = useMemo(() => {
		if (!dbcSearch) return groups;
		return groups.filter((b) => dbcSearch ? b.name.includes(dbcSearch) : true);
	}, [groups, dbcSearch]);

	const handleSave = useCallback(() => {
		fetcher.submit({ type: 'reorderGroups', groups: tempGroups.join(',') }, { method: 'post' });
		setTempGroups([]);
	}, [fetcher, tempGroups]);

	const canManageAnything = useMemo(() => groups.some((c) => c.accessLevel === 'admin'), [groups]);
	useEffect(() => setCanInvite?.(canManageAnything), [canManageAnything, setCanInvite]);
	useEffect(() => setShowAllBoards?.(groups.length !== 0), [setShowAllBoards]);

	useEffect(() => {
		if (tempGroups.length > 0) {
			setDidShowAlert(true);
		}
	}, [tempGroups]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Category Groups'}
					description={'List of all groups that are currently available to you.'}
					customButtons={user?.isDev ? [{
						type: 'normal',
						label: 'Manage groups.',
						icon: <FaTools />,
						isDisabled: groups.length === 0,
						onClick: () => setEditorMode(!editorMode),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Manage groups.',
						isActive: editorMode,
					}, {
						type: 'normal',
						label: 'Create group.',
						icon: <FaPlus />,
						onClick: () => setModalOpen('createGroup'),
						isLoading: fetcher.state === 'loading',
						tooltip: 'Create group.',
					}] : []}
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'groups'} id='groups' dividerMY={4} />

				<CardList
					key={revertKey}
					noWhat='groups'
					onDelete={editorMode ? (index) => {
						setModalOpen('deleteGroup');
						setGroupId(finalGroups[index]!.id);
					} : undefined}
					onEdit={editorMode ? (index) => {
						setModalOpen('updateGroup');
						setGroupId(finalGroups[index]!.id);
					} : undefined}
					onReorder={editorMode ? (orderedIds) => {
						setTempGroups(orderedIds);
					} : undefined}
					cards={finalGroups.map((g) => ({
						id: g.id,
						editorMode,
						canManageAnything,
						url: `/groups/${g.id}`,
						sizeBytes: g.sizeBytes,
						isDeleteDisabled: g.categories > 0,
						permsUrl: (user?.isDev || g.accessLevel === 'admin') ? `/permissions/${g.id}` : undefined,
						name: g.name.charAt(0).toUpperCase() + g.name.slice(1),
					}))}
				/>

				<ManageGroup
					isOpen={modalOpen !== null}
					onClose={() => setModalOpen(null)}
					type={modalOpen || 'createGroup'}
					fetcher={fetcher}
					defaultName={finalGroups.find((g) => g.id === groupId)?.name || ''}
					groupId={groupId || undefined}
				/>

				<NoticeCard
					isFloating={true}
					useIconButtons={true}
					isVisible={tempGroups.length > 0}
					message='Save your changes or cancel to revert.'
					variant='warning'
					confirmText='Save Changes'
					cancelText='Cancel'
					onConfirm={() => {
						handleSave();
						setDidShowAlert(false);
					}}
					onCancel={() => {
						setTempGroups([]);
						setDidShowAlert(false);
						setRevertKey(prev => prev + 1);
					}}
				/>
			</Box>
		</VStack>
	);
}

export type ModalOpen = 'createGroup' | 'updateGroup' | 'deleteGroup' | null;
export type ManageGroupProps = {
	isOpen: boolean;
	onClose: () => void;

	type: NonNullable<ModalOpen>;
	fetcher: FetcherWithComponents<unknown>;

	defaultName?: string;
	groupId?: string;
};

export function ManageGroup({ isOpen, onClose, type, fetcher, defaultName, groupId }: ManageGroupProps) {
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
							{type === 'createGroup' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='newGroup' />
									<Box flex={1}>
										<Input
											id='groupName'
											name='groupName'
											placeholder='Group Name'
											defaultValue={defaultName || ''}
											maxLength={50}
											minLength={1}
											autoFocus
										/>
									</Box>
								</>
							)}

							{type === 'updateGroup' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='updateGroup' />
									<VisuallyHiddenInput onChange={() => { }} name='groupId' value={groupId || ''} />

									<Box flex={1}>
										<Input
											id='groupName'
											name='groupName'
											placeholder='Group Name'
											defaultValue={defaultName || ''}
											maxLength={50}
											minLength={1}
											autoFocus
										/>
									</Box>
								</>
							)}

							{type === 'deleteGroup' && (
								<>
									<VisuallyHiddenInput onChange={() => { }} name='type' value='deleteGroup' />
									<VisuallyHiddenInput onChange={() => { }} name='groupId' value={groupId || ''} />
									Are you sure you want to delete this group? <br />
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
							colorScheme={type === 'deleteGroup' ? 'red' : 'blue'}
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
