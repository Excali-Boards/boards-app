import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Text, useColorMode, HStack } from '@chakra-ui/react';
import { ReactElement } from 'react';

export type ConfirmModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	isLoading?: boolean;
	colorScheme?: string;
	icon?: ReactElement;
};

export function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	isLoading = false,
	colorScheme,
	icon,
}: ConfirmModalProps) {
	const { colorMode } = useColorMode();

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='md' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>
					<HStack spacing={3}>
						{icon && icon}
						<Text>{title}</Text>
					</HStack>
				</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					{message.split('\n').map((line, index) => (
						<Text key={index} mb={index < message.split('\n').length - 1 ? 2 : 0}>
							{line}
						</Text>
					))}
				</ModalBody>
				<ModalFooter display='flex' gap={1}>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
						isDisabled={isLoading}
					>
						{cancelText}
					</Button>
					<Button
						flex={1}
						onClick={onConfirm}
						isLoading={isLoading}
						colorScheme={colorScheme || 'blue'}
					>
						{confirmText}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}

export default ConfirmModal;
