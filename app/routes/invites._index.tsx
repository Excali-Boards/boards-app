import { GrantPermissionsModal } from '~/components/permissions/GrantPermissionModal';
import { CreateInviteModal } from '~/components/permissions/CreateInviteModal';
import { ResourceInvites } from '~/components/permissions/ResourceInvites';
import { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { makeResObject, makeResponse } from '~/utils/functions.server';
import { VStack, Box, useToast, Divider } from '@chakra-ui/react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { FaAddressCard, FaUserPlus } from 'react-icons/fa';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { WebReturnType } from '~/other/types';
import { useContext, useState } from 'react';
import { canManage } from '~/other/utils';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBInvites = await api?.invites.getUserInvites({ auth: token });
	if (!DBInvites || 'error' in DBInvites) throw makeResponse(DBInvites, 'Failed to get user invites.');

	const DBResources = await api?.groups.getAllSorted({ auth: token });
	if (!DBResources || 'error' in DBResources) throw makeResponse(DBResources, 'Failed to get groups.');
	else if ((!DBInvites.data.canInvite)) throw makeResponse(null, 'You do not have permission to manage invites.');

	const canSelectGroups = DBResources.data.some((g) => canManage(g.accessLevel));
	const canSelectCategories = DBResources.data.some((g) => g.categories.some((c) => canManage(c.accessLevel)));
	const canSelectBoards = DBResources.data.some((g) => g.categories.some((c) => c.boards.some((b) => canManage(b.accessLevel))));

	return {
		invites: DBInvites.data.invites,
		allData: DBResources.data,

		options: {
			canSelectGroups,
			canSelectCategories,
			canSelectBoards,
		},
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
		case 'renewInvite': {
			const inviteCode = formData.get('inviteCode') as string;
			if (!inviteCode) return { status: 400, error: 'Invalid invite code.' };

			const result = await api?.invites.renewInvite({ auth: token, code: inviteCode });
			if (result?.status !== 200) return makeResObject(result, 'Failed to renew invite.');
			return makeResObject({ status: result.status, data: 'Invite renewed successfully.' }, null);
		}
		default: {
			return { status: 400, error: 'Invalid request.' };
		}
	}
};

export default function InvitesPage() {
	const { invites, allData, options } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};

	const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
	const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name='Your Invites'
					description='Manage your active invites. Create new invites to share access to your resources.'
					goBackWindow={true}
					customButtons={[{
						type: 'normal',
						label: 'Grant Permissions',
						tooltip: 'Grant permissions to a user',
						icon: <FaAddressCard />,
						onClick: () => setIsPermissionModalOpen(true),
						isDisabled: !(user?.isDev || options.canSelectGroups || options.canSelectCategories || options.canSelectBoards),
					}, {
						type: 'normal',
						label: 'Create Invite',
						icon: <FaUserPlus />,
						onClick: () => setIsInviteModalOpen(true),
						tooltip: 'Create new invite',
						isDisabled: !(user?.isDev || options.canSelectGroups || options.canSelectCategories || options.canSelectBoards),
					}]}
				/>

				<Divider my={4} />

				<ResourceInvites
					invites={invites}
					canManage={true}
					showRenew={true}
				/>

				<CreateInviteModal
					isOpen={isInviteModalOpen}
					onClose={() => setIsInviteModalOpen(false)}
					allData={allData}

					canSelectGroups={user?.isDev || options.canSelectGroups}
					canSelectCategories={user?.isDev || options.canSelectCategories}
					canSelectBoards={user?.isDev || options.canSelectBoards}
				/>

				<GrantPermissionsModal
					isOpen={isPermissionModalOpen}
					onClose={() => setIsPermissionModalOpen(false)}
					allData={allData}

					canSelectGroups={user?.isDev || options.canSelectGroups}
					canSelectCategories={user?.isDev || options.canSelectCategories}
					canSelectBoards={user?.isDev || options.canSelectBoards}
				/>
			</Box>
		</VStack>
	);
}
