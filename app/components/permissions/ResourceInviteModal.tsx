import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, VStack, FormControl, FormLabel, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, useColorMode, VisuallyHiddenInput, Input, Flex, useToast } from '@chakra-ui/react';
import { useFetcherResponse } from '~/hooks/useFetcherResponse';
import { ResourceType } from '@excali-boards/boards-api-client';
import { HigherRoles, LowerRoles } from './CreateInviteModal';
import { useState, useMemo, useCallback } from 'react';
import { firstToUpperCase } from '~/other/utils';
import { WebReturnType } from '~/other/types';
import { useFetcher } from '@remix-run/react';
import Select from '~/components/Select';

export type ResourceInviteModalProps = {
	isOpen: boolean;
	onClose: () => void;
	resourceType: ResourceType;

	boardId?: string;
	boardName?: string;

	categoryId?: string;
	categoryName?: string;

	groupId: string;
	groupName: string;
};

export function ResourceInviteModal({
	isOpen,
	onClose,
	resourceType,
	boardId,
	boardName,
	categoryId,
	categoryName,
	groupId,
	groupName,
}: ResourceInviteModalProps) {
	const { colorMode } = useColorMode();

	const fetcher = useFetcher<WebReturnType<string>>();
	const toast = useToast();

	const [selectedRole, setSelectedRole] = useState<string | null>('Viewer');
	const [expiresIn, setExpiresIn] = useState(7);
	const [maxUses, setMaxUses] = useState(1);

	useFetcherResponse(fetcher, toast, () => {
		onClose();

		setMaxUses(1);
		setExpiresIn(7);
	});

	const resourcePath = useMemo(() => {
		if (resourceType === 'group') return groupName;
		if (resourceType === 'category') return `${groupName} → ${categoryName}`;
		if (resourceType === 'board') return `${groupName} → ${categoryName} → ${boardName}`;
		return boardName;
	}, [resourceType, groupName, categoryName, boardName]);

	const resourceId = useMemo(() => {
		if (resourceType === 'group') return groupId;
		if (resourceType === 'category') return categoryId;
		if (resourceType === 'board') return boardId;
		return undefined;
	}, [resourceType, groupId, categoryId, boardId]);

	const handleSubmit = useCallback(() => {
		const inviteData: Record<string, unknown> = {};

		if (maxUses) inviteData.maxUses = maxUses;
		if (expiresIn) inviteData.expiresIn = expiresIn;

		switch (resourceType) {
			case 'group':
				inviteData.groupIds = [resourceId];
				if (selectedRole) inviteData.groupRole = 'Group' + selectedRole;
				break;
			case 'category':
				inviteData.categoryIds = [resourceId];
				if (selectedRole) inviteData.categoryRole = 'Category' + selectedRole;
				break;
			case 'board':
				inviteData.boardIds = [resourceId];
				if (selectedRole) inviteData.boardRole = 'Board' + selectedRole;
				break;
			default:
				break;
		}

		const formData = new FormData();
		formData.append('type', 'createInvite');
		formData.append('inviteData', JSON.stringify(inviteData));
		fetcher.submit(formData, { method: 'post' });
	}, [maxUses, expiresIn, fetcher, selectedRole, resourceType, resourceId]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<fetcher.Form method='post'>
					<ModalHeader>Create Invite</ModalHeader>
					<ModalCloseButton />
					<ModalBody>
						<VisuallyHiddenInput name='type' value='createInvite' />
						<VisuallyHiddenInput name='resourceType' value={resourceType} />
						<VisuallyHiddenInput name='resourceId' value={resourceId} />
						<VisuallyHiddenInput name='expiresIn' value={expiresIn.toString()} />
						<VisuallyHiddenInput name='maxUses' value={maxUses.toString()} />
						{selectedRole && <VisuallyHiddenInput name='role' value={firstToUpperCase(resourceType) + selectedRole} />}

						<VStack spacing={6}>
							<VStack spacing={4} w='full'>
								<FormControl>
									<FormLabel fontSize='sm' fontWeight='semibold'>
										Resource ({resourceType.charAt(0).toUpperCase() + resourceType.slice(1)})
									</FormLabel>
									<Input
										isReadOnly
										isDisabled
										value={resourcePath}
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

								<Flex w='100%' gap={4} flexDir={{ base: 'column', md: 'row' }}>
									<FormControl flex={1}>
										<FormLabel fontSize='sm' fontWeight='semibold'>
											Maximum uses
										</FormLabel>
										<NumberInput
											value={maxUses}
											onChange={(_, num) => setMaxUses(num)}
											min={1}
											max={100}
										>
											<NumberInputField />
											<NumberInputStepper>
												<NumberIncrementStepper />
												<NumberDecrementStepper />
											</NumberInputStepper>
										</NumberInput>
									</FormControl>

									<FormControl flex={1}>
										<FormLabel fontSize='sm' fontWeight='semibold'>
											Expires in (days)
										</FormLabel>
										<NumberInput
											value={expiresIn}
											onChange={(_, num) => setExpiresIn(num)}
											min={1}
											max={30}
										>
											<NumberInputField />
											<NumberInputStepper>
												<NumberIncrementStepper />
												<NumberDecrementStepper />
											</NumberInputStepper>
										</NumberInput>
									</FormControl>
								</Flex>
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
							isDisabled={!selectedRole}
							isLoading={fetcher.state === 'submitting' || fetcher.state === 'loading'}
						>
							Create Invite
						</Button>
					</ModalFooter>
				</fetcher.Form>
			</ModalContent>
		</Modal>
	);
}
