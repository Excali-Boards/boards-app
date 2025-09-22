import { ResourceType, ViewPermissionsOutput } from '@excali-boards/boards-api-client';
import { UserCard, NoUserCard } from '../permissions/UserCard';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { VStack, useToast } from '@chakra-ui/react';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';
import { useCallback } from 'react';

export type ResourceUsersProps = {
	resourceType: ResourceType;
	resourceId: string;

	users: ViewPermissionsOutput;
	canManage: boolean;
};

export function ResourceUsers({ resourceType, resourceId, users, canManage }: ResourceUsersProps) {
	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	useFetcherResponse(fetcher, toast);

	const handleRevokePermission = useCallback((userId: string, rType: ResourceType, rId: string) => {
		const formData = new FormData();
		formData.append('type', 'revokePermission');
		formData.append('userId', userId);
		formData.append('resourceType', rType);
		formData.append('resourceId', rId);
		fetcher.submit(formData, { method: 'post' });
	}, [fetcher]);

	const getUserPerm = useCallback((user: ViewPermissionsOutput[number]) => {
		const permission = user.permissions.find((p) => p.type === resourceType && p.resourceId === resourceId);
		return permission || null;
	}, [resourceId, resourceType]);

	return (
		<VStack w='100%' spacing={2}>
			{users.length ? users.map((user, i) => {
				const permission = getUserPerm(user);
				if (!permission) return null;

				return (
					<UserCard
						key={user.userId + '|' + i}
						id={user.userId}
						userId={user.userId}
						username={user.displayName}
						role={permission.role}
						avatar={user.avatarUrl || undefined}
						canManage={canManage}
						basedOnType={permission.basedOnType !== permission.type ? permission.basedOnType : null}
						onRevoke={() => handleRevokePermission(user.userId, permission.basedOnType, permission.basedOnResourceId)}
					/>
				);
			}) : (
				<NoUserCard noWhat='users with access' />
			)}
		</VStack>
	);
}
