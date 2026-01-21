import { getIpHeaders, makeResObject, makeResponse } from '~/utils/functions.server';
import { ResourceInviteModal } from '~/components/permissions/ResourceInviteModal';
import { ResourceGrantModal } from '~/components/permissions/ResourceGrantModal';
import { ResourceInvites } from '~/components/permissions/ResourceInvites';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { ResourceUsers } from '~/components/sessions/ResourceUsers';
import { canInviteAndPermit, validateParams } from '~/other/utils';
import { VStack, Box, useToast, Divider } from '@chakra-ui/react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { ResourceType } from '@excali-boards/boards-api-client';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { FaAddressCard, FaGift } from 'react-icons/fa';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { WebReturnType } from '~/other/types';
import { useContext, useState } from 'react';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBBoard = await api?.boards.getBoard({ auth: token, boardId, groupId, categoryId, headers: ipHeaders });
	if (!DBBoard || 'error' in DBBoard) throw makeResponse(DBBoard, 'Failed to get board.');

	const DBBoardPermissions = await api?.permissions.viewPermissions({ auth: token, query: { type: 'board', id: boardId }, headers: ipHeaders });
	if (!DBBoardPermissions || 'error' in DBBoardPermissions) throw makeResponse(DBBoardPermissions, 'Failed to get board permissions.');

	const DBBoardInvites = await api?.invites.getResourceInvites({ auth: token, query: { type: 'board', groupId, categoryId, boardId }, headers: ipHeaders });
	if (!DBBoardInvites || 'error' in DBBoardInvites) throw makeResponse(DBBoardInvites, 'Failed to get board invites.');

	return {
		group: DBBoard.data.group,
		category: DBBoard.data.category,
		board: DBBoard.data.board,
		users: DBBoardPermissions.data,
		invites: DBBoardInvites.data,
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) return makeResObject(null, 'Failed to get client IP.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'createInvite': {
			const inviteData = JSON.parse(formData.get('inviteData') as string);
			const result = await api?.invites.createInvite({ auth: token, body: inviteData, headers: ipHeaders });

			if (result?.status !== 200) return makeResObject(result, 'Failed to create invite.');
			return makeResObject({ status: result.status, data: 'Invite created successfully.' }, null);
		}
		case 'grantPermissions': {
			const permissionData = JSON.parse(formData.get('permissionData') as string);
			const result = await api?.permissions.grantPermissions({ auth: token, body: permissionData, headers: ipHeaders });
			return makeResObject(result, 'Failed to grant permissions.');
		}
		case 'deleteInvite': {
			const inviteCode = formData.get('inviteCode') as string;
			if (!inviteCode) return { status: 400, error: 'Invalid invite code.' };

			const result = await api?.invites.revokeInvite({ auth: token, code: inviteCode, headers: ipHeaders });
			return makeResObject(result, 'Failed to delete invite.');
		}
		case 'renewInvite': {
			const inviteCode = formData.get('inviteCode') as string;
			if (!inviteCode) return { status: 400, error: 'Invalid invite code.' };

			const result = await api?.invites.renewInvite({ auth: token, code: inviteCode, headers: ipHeaders });
			if (result?.status !== 200) return makeResObject(result, 'Failed to renew invite.');
			return makeResObject({ status: result.status, data: 'Invite renewed successfully.' }, null);
		}
		case 'revokePermission': {
			const userId = formData.get('userId') as string;
			const resourceType = formData.get('resourceType') as ResourceType;
			const resourceId = formData.get('resourceId') as string;

			if (!userId || !resourceType || !resourceId) return { status: 400, error: 'Missing required fields.' };

			const result = await api?.permissions.revokePermissions({
				auth: token,
				body: { userId, resourceType: resourceType, resourceId },
				headers: ipHeaders,
			});

			return makeResObject(result, 'Failed to revoke permission.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function BoardPermissions() {
	const { group, category, board, users, invites } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};

	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const canManagePermissions = canInviteAndPermit(board.accessLevel, user?.isDev);

	useFetcherResponse(fetcher, toast, () => {
		setIsInviteModalOpen(false);
		setIsPermissionModalOpen(false);
	});

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Permissions: ${board.name}`}
					description={`Manage user access and invites for board ${board.name}.`}
					goBackPath={`/permissions/${group.id}/${category.id}`}
					goBackWindow={true}
					customButtons={[{
						type: 'normal',
						label: 'Grant Permissions',
						tooltip: 'Grant permissions to a user for this board',
						icon: <FaAddressCard />,
						isDisabled: !canManagePermissions,
						onClick: () => setIsPermissionModalOpen(true),
					}, {
						type: 'normal',
						label: 'Create Invite',
						tooltip: 'Create an invite for this board',
						icon: <FaGift />,
						isDisabled: !canManagePermissions,
						onClick: () => setIsInviteModalOpen(true),
					}]}
				/>

				<Divider my={4} />

				<ResourceInvites
					invites={invites}
					canManage={canManagePermissions}
				/>

				<Divider my={4} />

				<ResourceUsers
					users={users}
					resourceType='board'
					resourceId={board.id}
					canManage={canManagePermissions}
					currentUserId={user?.userId}
					isCurrentUserDev={user?.isDev}
				/>
			</Box>

			<ResourceInviteModal
				isOpen={isInviteModalOpen}
				onClose={() => setIsInviteModalOpen(false)}
				resourceType='board'
				boardId={board.id}
				boardName={board.name}
				categoryId={category.id}
				categoryName={category.name}
				groupId={group.id}
				groupName={group.name}
			/>

			<ResourceGrantModal
				isOpen={isPermissionModalOpen}
				onClose={() => setIsPermissionModalOpen(false)}
				resourceType='board'
				resourceId={board.id}
				resourceName={board.name}
			/>
		</VStack>
	);
}
