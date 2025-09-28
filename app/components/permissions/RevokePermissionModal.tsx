import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Button, Text, VStack, useColorMode, HStack, Badge, Flex, IconButton } from '@chakra-ui/react';
import { ResourceType } from '@excali-boards/boards-api-client';
import { FaTrash } from 'react-icons/fa';
import { useCallback } from 'react';

interface RevokePermissionModalProps {
	isOpen: boolean;
	onClose: () => void;
	username: string;
	permission: {
		type: ResourceType;
		resourceId: string;
		basedOnType: ResourceType;
		basedOnResourceId: string;
		basedOnResourceName: string;
		grantType: 'explicit' | 'implicit';
		role: string;
	};

	onConfirm: (resourceType: ResourceType, resourceId: string) => void;
}

export function RevokePermissionModal({
	isOpen,
	onClose,
	username,
	permission,
	onConfirm,
}: RevokePermissionModalProps) {
	const { colorMode } = useColorMode();

	const isDirectAccess = permission.grantType === 'explicit';
	const hasIndirectAccess = permission.basedOnType !== permission.type;

	const handleRevokeDirectAccess = useCallback(() => {
		onConfirm(permission.type, permission.resourceId);
		onClose();
	}, [onConfirm, onClose, permission]);

	const handleRevokeIndirectAccess = useCallback(() => {
		onConfirm(permission.basedOnType, permission.basedOnResourceId);
		onClose();
	}, [onConfirm, onClose, permission]);

	const getResourceLabel = (type: ResourceType) => {
		switch (type) {
			case 'group': return 'Group';
			case 'category': return 'Category';
			case 'board': return 'Board';
			default: return type;
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='lg' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>
					Revoke Access for {username}
				</ModalHeader>
				<ModalCloseButton />

				<ModalBody>
					<Flex direction='column' gap={4}>
						<Text color='gray.500'>
							This user has access through the following permission(s).
						</Text>

						<VStack spacing={3} w='full'>
							{isDirectAccess && (
								<HStack
									p={4}
									bg='alpha100'
									rounded='lg'
									justify='space-between'
									align='center'
									w='full'
								>
									<VStack align='start' spacing={1}>
										<HStack>
											<Text fontWeight='bold'>{permission.role}</Text>
											<Badge bg='green.500' color='white'>Direct</Badge>
										</HStack>
										<Text fontSize='sm' color='gray.500'>
											Direct permission on this {getResourceLabel(permission.type).toLowerCase()}.
										</Text>
									</VStack>
									<IconButton
										aria-label='Revoke Direct Access'
										icon={<FaTrash />}
										size='sm'
										colorScheme='red'
										onClick={handleRevokeDirectAccess}
									/>
								</HStack>
							)}

							{hasIndirectAccess && (
								<HStack
									p={4}
									bg='alpha100'
									rounded='lg'
									justify='space-between'
									align='center'
									w='full'
								>
									<VStack align='start' spacing={1}>
										<HStack>
											<Text fontWeight='bold'>{permission.role}</Text>
											<Badge bg='orange.500' color='white'>Inherited</Badge>
										</HStack>
										<Text fontSize='sm' color='gray.500'>
											Permission inherited from {permission.basedOnResourceName}.
										</Text>
									</VStack>
									<IconButton
										aria-label='Revoke Indirect Access'
										icon={<FaTrash />}
										size='sm'
										colorScheme='red'
										onClick={handleRevokeIndirectAccess}
									/>
								</HStack>
							)}
						</VStack>
					</Flex>
				</ModalBody>

				<ModalFooter>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
					>
						Cancel
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
