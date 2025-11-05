import { Button, Flex, Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay, useColorMode, useToast } from '@chakra-ui/react';
import { QRCode, IProps } from 'react-qrcode-logo';
import { useCallback } from 'react';

export type QRCodeModalProps = {
	isOpen: boolean;
	qrCodeDataUrl: string;
	onClose: () => void;
} & IProps;

export function QRCodeModal({ isOpen, qrCodeDataUrl, onClose, ...props }: QRCodeModalProps) {
	const { colorMode } = useColorMode();
	const toast = useToast();

	const handleShare = useCallback(async () => {
		try {
			if (navigator.share) {
				await navigator.share({
					title: 'Invite Link',
					url: qrCodeDataUrl,
				});
			} else {
				await navigator.clipboard.writeText(qrCodeDataUrl);
				toast({
					title: 'Invite link copied to clipboard',
					status: 'success',
					duration: 3000,
				});
			}
		} catch {
			toast({
				title: 'Could not share the link',
				status: 'error',
				duration: 3000,
			});
		}
	}, [qrCodeDataUrl, toast]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Invite QR Code</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Flex justifyContent='center'>
						<QRCode
							logoImage='/logo-tr.webp'
							removeQrCodeBehindLogo={true}
							logoPaddingStyle='circle'
							logoPaddingRadius={10}
							value={qrCodeDataUrl}
							logoHeight={80}
							logoWidth={80}
							eyeRadius={15}
							quietZone={10}
							qrStyle='dots'
							size={300}
							style={{
								borderRadius: '12px',
							}}
							{...props}
						/>
					</Flex>
				</ModalBody>
				<ModalFooter display='flex' gap={1}>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
					>
						Close
					</Button>
					<Button
						flex={1}
						colorScheme='blue'
						onClick={handleShare}
					>
						Share
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
