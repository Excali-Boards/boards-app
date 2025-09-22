import { FlexProps, useColorMode, Flex, HStack, Button, IconButton, Text, Portal, SlideFade, Box } from '@chakra-ui/react';
import { FaTimes, FaCheck } from 'react-icons/fa';

export type NoticeCardProps = {
	variant: 'info' | 'success' | 'warning' | 'danger';
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm?: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
	isFloating?: boolean;
	isVisible?: boolean;
	useIconButtons?: boolean;
} & FlexProps;

export function NoticeCard({
	variant,
	message,
	confirmText = 'OK',
	cancelText = 'Cancel',
	onConfirm,
	onCancel,
	isLoading = false,
	isFloating = false,
	isVisible = true,
	useIconButtons = false,
	...rest
}: NoticeCardProps) {
	const { colorMode } = useColorMode();

	const variantStyles = {
		info: {
			bg: colorMode === 'light' ? 'blue.200' : 'blue.800',
			text: colorMode === 'light' ? 'blue.800' : 'blue.200',
			border: colorMode === 'light' ? 'blue.200' : 'blue.700',
		},
		success: {
			bg: colorMode === 'light' ? 'green.200' : 'green.800',
			text: colorMode === 'light' ? 'green.800' : 'green.200',
			border: colorMode === 'light' ? 'green.200' : 'green.700',
		},
		warning: {
			bg: colorMode === 'light' ? 'yellow.200' : 'yellow.800',
			text: colorMode === 'light' ? 'yellow.800' : 'yellow.200',
			border: colorMode === 'light' ? 'yellow.200' : 'yellow.700',
		},
		danger: {
			bg: colorMode === 'light' ? 'red.200' : 'red.800',
			text: colorMode === 'light' ? 'red.800' : 'red.200',
			border: colorMode === 'light' ? 'red.200' : 'red.700',
		},
	}[variant];

	const colorScheme = variant === 'danger' ? 'red' : variant === 'warning' ? 'yellow' : variant === 'success' ? 'green' : 'blue';

	const cardContent = (
		<Flex
			gap={4}
			w={isFloating ? 'auto' : '100%'}
			maxW={isFloating ? '500px' : undefined}
			py={4} px={6}
			rounded={'lg'}
			height={'100%'}
			alignItems={'center'}
			bg={variantStyles.bg}
			border={`1px solid var(--chakra-colors-${variantStyles.border})`}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			justifyContent={'space-between'}
			boxShadow={isFloating ? 'lg' : undefined}
			{...rest}
		>
			<Flex
				justifyContent='center'
				alignItems='start'
				textAlign='start'
				flexDir='column'
				flexGrow={1}
			>
				<Text fontSize={'lg'} fontWeight={'bold'} color={variantStyles.text}>{message}</Text>
			</Flex>

			<HStack spacing={2}>
				{onCancel && (
					useIconButtons ? (
						<IconButton
							size='sm'
							aria-label={cancelText}
							onClick={onCancel}
							colorScheme={colorScheme}
							isDisabled={isLoading}
							icon={<FaTimes />}
						/>
					) : (
						<Button
							size='sm'
							onClick={onCancel}
							colorScheme={colorScheme}
							isDisabled={isLoading}
							rightIcon={<FaTimes />}
						>
							{cancelText}
						</Button>
					)
				)}

				{onConfirm && (
					useIconButtons ? (
						<IconButton
							size='sm'
							aria-label={confirmText}
							onClick={onConfirm}
							colorScheme={colorScheme}
							isLoading={isLoading}
							icon={<FaCheck />}
						/>
					) : (
						<Button
							size='sm'
							onClick={onConfirm}
							colorScheme={colorScheme}
							isLoading={isLoading}
							rightIcon={<FaCheck />}
						>
							{confirmText}
						</Button>
					)
				)}
			</HStack>
		</Flex>
	);

	if (isFloating) {
		return (
			<Portal>
				<SlideFade in={isVisible} offsetY='20px'>
					<Box
						position='fixed'
						bottom='20px'
						left='50%'
						transform='translateX(-50%)'
						zIndex={1000}
						maxW='95vw'
						minW='500px'
						width='auto'
						sx={{
							'& > div': {
								width: '100%',
								maxW: '100%',
							},
						}}
					>
						{cardContent}
					</Box>
				</SlideFade>
			</Portal>
		);
	}

	return cardContent;
}
