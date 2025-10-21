import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Button, Input, FormControl, FormLabel, VStack, Text, FormHelperText, useColorMode, Link } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

export type CountryCodeModalProps = {
	isOpen: boolean;
	canManage: boolean;
	onClose: () => void;
	currentCountryCode: string | null;
	onSave: (countryCode: string | null) => void;
	isLoading?: boolean;
};

export function CountryCodeModal({
	isOpen,
	onSave,
	onClose,
	canManage,
	currentCountryCode,
	isLoading = false,
}: CountryCodeModalProps) {
	const [countryCode, setCountryCode] = useState(currentCountryCode || '');
	const { colorMode } = useColorMode();

	useEffect(() => {
		setCountryCode(currentCountryCode || '');
	}, [currentCountryCode, isOpen]);

	const handleSave = () => {
		const trimmedCode = countryCode.trim();
		onSave(trimmedCode === '' ? null : trimmedCode.toUpperCase());
	};

	const handleReset = () => {
		setCountryCode('');
		onSave(null);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='md' isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Calendar Country Settings</ModalHeader>
				<ModalCloseButton />

				<ModalBody>
					<VStack spacing={4} align='stretch'>
						<Text fontSize='sm' color={colorMode === 'light' ? 'gray.600' : 'gray.400'}>
							Select a country code to enable country-specific holidays in your calendar.{' '}
							<Link
								href='https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes'
								target='_blank' rel='noopener noreferrer'
								textDecoration='underline'
							>
								Find your country code
							</Link>
							.
						</Text>

						<FormControl>
							<FormLabel>Country Code</FormLabel>
							<Input
								value={countryCode}
								isDisabled={!canManage || isLoading}
								onChange={(e) => setCountryCode(e.target.value)}
								placeholder='US, GB, DE, FR, HR'
								maxLength={2}
								textTransform='uppercase'
								bg={colorMode === 'light' ? 'white' : 'brand800'}
								_focus={{ borderColor: 'blue.400' }}
								autoFocus
							/>
							<FormHelperText color={colorMode === 'light' ? 'gray.500' : 'gray.400'}>
								Enter a 2-letter ISO country code (e.g., US for United States, GB for United Kingdom).
								Leave empty to disable country-specific holidays.
							</FormHelperText>
						</FormControl>
					</VStack>
				</ModalBody>

				<ModalFooter display='flex' gap={1}>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
						isDisabled={isLoading}
					>
						Close
					</Button>

					{canManage && (
						<>
							<Button
								flex={1}
								colorScheme='red'
								onClick={handleReset}
								isDisabled={isLoading}
							>
								Reset
							</Button>
							<Button
								flex={1}
								colorScheme='blue'
								onClick={handleSave}
								isLoading={isLoading}
							>
								Save
							</Button></>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
