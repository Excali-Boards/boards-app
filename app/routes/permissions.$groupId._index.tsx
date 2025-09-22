import { ResourceInviteModal } from '~/components/permissions/ResourceInviteModal';
import { ResourceGrantModal } from '~/components/permissions/ResourceGrantModal';
import { ResourceInvites } from '~/components/permissions/ResourceInvites';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { ResourceUsers } from '~/components/sessions/ResourceUsers';
import { VStack, Box, Divider, useToast } from '@chakra-ui/react';
import { useFetcher, useLoaderData } from '@remix-run/react';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { FaAddressCard, FaGift } from 'react-icons/fa';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { validateParams } from '~/other/utils';
import { WebReturnType } from '~/other/types';
import { useContext, useState } from 'react';
import { api } from '~/utils/web.server';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId } = validateParams(params, ['groupId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBGroup = await api?.groups.getGroup({ auth: token, groupId });
	if (!DBGroup || 'error' in DBGroup) throw makeResponse(DBGroup, 'Failed to get group.');

	const DBGroupPermissions = await api?.permissions.viewPermissions({ auth: token, query: { type: 'group', id: groupId } });
	if (!DBGroupPermissions || 'error' in DBGroupPermissions) throw makeResponse(DBGroupPermissions, 'Failed to get group permissions.');

	const DBGroupInvites = await api?.invites.getResourceInvites({ auth: token, query: { type: 'group', groupId } });
	if (!DBGroupInvites || 'error' in DBGroupInvites) throw makeResponse(DBGroupInvites, 'Failed to get group invites.');

	return {
		group: DBGroup.data.group,
		categories: DBGroup.data.categories,
		users: DBGroupPermissions.data,
		invites: DBGroupInvites.data,
	};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) return makeResObject(null, 'You are not authorized to perform this action.');

	const formData = await request.formData();
	const type = formData.get('type') as string;

	switch (type) {
		case 'createInvite': {
			const inviteData = JSON.parse(formData.get('inviteData') as string);
			const result = await api?.invites.createInvite({ auth: token, body: inviteData });

			if (result?.status !== 200) return makeResObject(result, 'Failed to create invite.');
			return makeResObject({ status: result.status, data: 'Invite created successfully.' }, null);
		}
		case 'grantPermissions': {
			const permissionData = JSON.parse(formData.get('permissionData') as string);
			const result = await api?.permissions.grantPermissions({ auth: token, body: permissionData });
			return makeResObject(result, 'Failed to grant permissions.');
		}
		case 'deleteInvite': {
			const inviteCode = formData.get('inviteCode') as string;
			if (!inviteCode) return { status: 400, error: 'Invalid invite code.' };

			const result = await api?.invites.revokeInvite({ auth: token, code: inviteCode });
			return makeResObject(result, 'Failed to delete invite.');
		}
		case 'revokePermission': {
			const userId = formData.get('userId') as string;
			const resourceType = formData.get('resourceType') as string;
			const resourceId = formData.get('resourceId') as string;

			if (!userId || !resourceType || !resourceId) {
				return { status: 400, error: 'Missing required fields.' };
			}

			const result = await api?.permissions.revokePermissions({
				auth: token,
				body: { userId, resourceType: resourceType as 'group' | 'category' | 'board', resourceId },
			});

			return makeResObject(result, 'Failed to revoke permission.');
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function GroupPermissions() {
	const { group, users, invites } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};

	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => {
		setIsInviteModalOpen(false);
		setIsPermissionModalOpen(false);
	});

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={`Permissions: ${group.name}`}
					description={`Manage user access and invites for group ${group.name}.`}
					goBackPath={'/groups'}
					customButtons={[{
						type: 'normal',
						label: 'Grant Permissions',
						tooltip: 'Grant permissions to a user for this group.',
						icon: <FaAddressCard />,
						onClick: () => setIsPermissionModalOpen(true),
					}, {
						type: 'normal',
						label: 'Create Invite',
						tooltip: 'Create an invite for this group.',
						icon: <FaGift />,
						onClick: () => setIsInviteModalOpen(true),
					}]}
				/>

				<Divider my={4} />

				<ResourceInvites
					invites={invites}
					canManage={user?.isDev || false}
				/>

				<Divider my={4} />

				<ResourceUsers
					users={users}
					resourceType='group'
					resourceId={group.id}
					canManage={user?.isDev || false}
				/>
			</Box>

			<ResourceInviteModal
				isOpen={isInviteModalOpen}
				onClose={() => setIsInviteModalOpen(false)}
				resourceType='group'
				groupId={group.id}
				groupName={group.name}
			/>

			<ResourceGrantModal
				isOpen={isPermissionModalOpen}
				onClose={() => setIsPermissionModalOpen(false)}
				resourceType='group'
				resourceId={group.id}
				resourceName={group.name}
			/>
		</VStack>
	);
}
