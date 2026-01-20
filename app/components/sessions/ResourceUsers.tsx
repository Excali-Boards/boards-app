import { GrantedEntry, ResourceType, PermUser } from '@excali-boards/boards-api-client';
import { RevokePermissionModal } from '../permissions/RevokePermissionModal';
import { VStack, useToast, useDisclosure } from '@chakra-ui/react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { UserCard, NoUserCard } from '../permissions/UserCard';
import { useCallback, useMemo, useState } from 'react';
import { canGrantRole, getLevel } from '~/other/utils';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';

export type ResourceUsersProps = {
	resourceType: ResourceType;
	resourceId: string;

	users: PermUser[];
	canManage: boolean;
	currentUserId?: string | null;
	isCurrentUserDev?: boolean;
};

export function ResourceUsers({ resourceType, resourceId, users, canManage, currentUserId, isCurrentUserDev }: ResourceUsersProps) {
	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string; permission: GrantedEntry; } | null>(null);
	const { isOpen: isRevokeOpen, onOpen: onRevokeOpen, onClose: onRevokeClose } = useDisclosure();

	useFetcherResponse(fetcher, toast);

	const handleRevokePermission = useCallback((userId: string, rType: ResourceType, rId: string) => {
		const formData = new FormData();
		formData.append('type', 'revokePermission');
		formData.append('userId', userId);
		formData.append('resourceType', rType);
		formData.append('resourceId', rId);
		fetcher.submit(formData, { method: 'post' });
	}, [fetcher]);

	const getUserPerm = useCallback((user: PermUser) => {
		const permissions = user.permissions.filter((p) => p.type === resourceType && p.resourceId === resourceId);
		if (permissions.length === 0) return null;

		return permissions.reduce((highest, permission) => (
			getLevel(permission.role) > getLevel(highest.role) ? permission : highest
		));
	}, [resourceId, resourceType]);

	const currentUserRole = useMemo(() => {
		if (!currentUserId) return null;
		const currentUser = users.find((u) => u.userId === currentUserId);
		if (!currentUser) return null;

		const roles = currentUser.permissions
			.filter((p) => p.type === resourceType && p.resourceId === resourceId)
			.map((p) => p.role);

		if (roles.length === 0) return null;

		return roles.reduce((highest, role) => getLevel(role) > getLevel(highest) ? role : highest);
	}, [currentUserId, resourceId, resourceType, users]);

	const handleOpenRevokeModal = useCallback((user: PermUser, permission: GrantedEntry) => {
		setSelectedUser({ userId: user.userId, username: user.displayName, permission });
		onRevokeOpen();
	}, [onRevokeOpen]);

	const handleConfirmRevoke = useCallback((rType: ResourceType, rId: string) => {
		if (selectedUser) handleRevokePermission(selectedUser.userId, rType, rId);
		onRevokeClose();
		setSelectedUser(null);
	}, [selectedUser, handleRevokePermission, onRevokeClose]);

	return (
		<>
			<VStack w='100%' spacing={2}>
				{users.length ? users.map((user, i) => {
					const permission = getUserPerm(user);
					if (!permission) return null;

					const canRevoke = canManage && (isCurrentUserDev || (!!currentUserRole && canGrantRole(currentUserRole, permission.role)));

					return (
						<UserCard
							key={user.userId + '|' + i}
							id={user.userId}
							userId={user.userId}
							username={user.displayName}
							role={permission.role}
							avatar={user.avatarUrl || undefined}
							canManage={canRevoke}
							grantType={permission.grantType}
							basedOnType={permission.basedOnType !== permission.type ? permission.basedOnType : null}
							onRevoke={() => handleOpenRevokeModal(user, permission)}
						/>
					);
				}) : (
					<NoUserCard noWhat='users with access' />
				)}
			</VStack>

			{selectedUser && (
				<RevokePermissionModal
					isOpen={isRevokeOpen}
					onClose={onRevokeClose}
					username={selectedUser.username}
					permission={selectedUser.permission}
					onConfirm={handleConfirmRevoke}
				/>
			)}
		</>
	);
}
