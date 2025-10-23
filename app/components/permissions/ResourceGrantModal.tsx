import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, VStack, FormControl, FormLabel, useColorMode, Input, useToast } from '@chakra-ui/react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { ResourceType } from '@excali-boards/boards-api-client';
import { HigherRoles, LowerRoles } from './CreateInviteModal';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';
import { useCallback, useState } from 'react';
import Select from '~/components/Select';

export type ResourceGrantModalProps = {
	isOpen: boolean;
	onClose: () => void;

	resourceType: ResourceType;
	resourceId: string;
	resourceName: string;
};

export function ResourceGrantModal({
	isOpen,
	onClose,
	resourceType,
	resourceId,
	resourceName,
}: ResourceGrantModalProps) {
	const { colorMode } = useColorMode();

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const [selectedRole, setSelectedRole] = useState<string | null>('Viewer');
	const [userId, setUserId] = useState<string | null>(null);

	useFetcherResponse(fetcher, toast);

	const handleSubmit = useCallback(() => {
		const permissionData: Record<string, unknown> = {};

		switch (resourceType) {
			case 'group':
				permissionData.groupIds = [resourceId];
				permissionData.groupRole = 'Group' + selectedRole;
				break;
			case 'category':
				permissionData.categoryIds = [resourceId];
				permissionData.categoryRole = 'Category' + selectedRole;
				break;
			case 'board':
				permissionData.boardIds = [resourceId];
				permissionData.boardRole = 'Board' + selectedRole;
				break;
			default:
				break;
		}

		if (userId) permissionData.userId = userId;
		else return;

		const formData = new FormData();
		formData.append('type', 'grantPermissions');
		formData.append('permissionData', JSON.stringify(permissionData));
		fetcher.submit(formData, { method: 'post' });

		if (fetcher.state === 'idle') {
			onClose();

			setSelectedRole('Viewer');
			setUserId(null);
		}
	}, [fetcher, onClose, selectedRole, userId, resourceType, resourceId]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method='post'>
					<ModalHeader>Grant Permissions</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<VStack spacing={6}>
							<VStack spacing={4} w='full'>
								<FormControl isRequired>
									<FormLabel fontSize='sm' fontWeight='semibold'>
										User ID
									</FormLabel>
									<Input
										placeholder='Enter user ID..'
										value={userId || ''}
										onChange={(e) => setUserId(e.target.value)}
										maxLength={20}
										minLength={5}
										autoFocus
									/>
								</FormControl>

								<FormControl>
									<FormLabel fontSize='sm' fontWeight='semibold'>
										Resource ({resourceType.charAt(0).toUpperCase() + resourceType.slice(1)})
									</FormLabel>
									<Input
										isReadOnly
										isDisabled
										value={resourceName}
									/>
								</FormControl>

								<FormControl>
									<FormLabel fontSize='sm' fontWeight='semibold'>
										Access Level
									</FormLabel>
									<Select
										defaultValue={HigherRoles.find((role) => role.value === selectedRole) || null}
										placeholder='Select access level..'
										onChange={(newValue) => setSelectedRole(newValue?.value || null)}
										options={resourceType === 'group' || resourceType === 'category' ? HigherRoles : LowerRoles}
									/>
								</FormControl>
							</VStack>
						</VStack>
					</ModalBody>
					<ModalFooter display='flex' gap={1}>
						<Button
							flex={1}
							colorScheme='gray'
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button
							flex={1}
							colorScheme='blue'
							onClick={handleSubmit}
							isDisabled={!selectedRole || !userId}
							isLoading={fetcher.state === 'submitting' || fetcher.state === 'loading'}
						>
							Grant Permissions
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}
