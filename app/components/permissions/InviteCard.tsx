import { Flex, Text, HStack, VStack, IconButton, FlexProps, Badge, useToast, useDisclosure, useBreakpointValue } from '@chakra-ui/react';
import { FaTrash, FaCopy, FaEye } from 'react-icons/fa';
import { ConfirmModal } from '../other/ConfirmModal';
import { useCallback } from 'react';

export type InputType = {
	value: string;
	label: string;
}

export type InviteCardProps = {
	id: string;
	code: string;
	role: string;
	uses: number;
	maxUses: number;
	expiresAt: Date | null;

	canManage?: boolean;
	onDelete?: () => void;
	onDetails: () => void;
};

export function InviteCard({
	code,
	role,
	uses,
	maxUses,
	expiresAt,
	canManage,
	onDelete,
	onDetails,
}: InviteCardProps & FlexProps) {
	const toast = useToast();
	const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

	const isMobile = useBreakpointValue({ base: true, md: false });
	const cardPadding = useBreakpointValue({ base: 4, md: 6 });
	const cardDirection = useBreakpointValue({ base: 'column', md: 'row' }) as 'column' | 'row';
	const codeTextSize = useBreakpointValue({ base: 'xl', md: '2xl' });
	const buttonSize = useBreakpointValue({ base: 'md', md: 'md' });

	const copyInviteLink = useCallback(() => {
		navigator.clipboard.writeText(`${window.location.origin}/invites/${code}`);
		toast({
			title: 'Invite link has been copied to your clipboard.',
			status: 'success',
			duration: 2000,
			isClosable: true,
		});
	}, [code, toast]);

	const isExpired = expiresAt && new Date(expiresAt) < new Date();
	const isMaxUsed = maxUses > 0 && uses >= maxUses;

	const formatExpiresIn = (date: Date) => {
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays <= 0) return 'Expired';
		if (diffDays === 1) return 'Expires in 1 day';
		return `Expires in ${diffDays} days`;
	};

	return (
		<Flex
			gap={isMobile ? 2 : 3}
			w={'100%'}
			py={cardPadding}
			px={cardPadding}
			rounded={'lg'}
			height={'100%'}
			alignItems={isMobile ? 'stretch' : 'center'}
			bg={isExpired || isMaxUsed ? 'red.50' : 'alpha100'}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			flexDirection={cardDirection}
			justifyContent={'space-between'}
			_hover={{ bg: isExpired || isMaxUsed ? 'red.100' : 'alpha200' }}
		>
			<Flex
				justifyContent='flex-start'
				alignItems='flex-start'
				textAlign='start'
				flexDir='column'
				flexGrow={1}
				minW={0}
			>
				<VStack spacing={1} align='stretch' w='100%'>
					<HStack spacing={3} align='center' justify='space-between' w='100%'>
						<Text
							fontSize={codeTextSize}
							fontWeight={'bold'}
							overflow='hidden'
							textOverflow='ellipsis'
							whiteSpace='nowrap'
							maxW={isMobile ? '60%' : 'none'}
						>
							{code}
						</Text>

						<HStack spacing={2} flexShrink={0}>
							{(isExpired || isMaxUsed) && (
								<Badge
									px={2} py={1}
									color={'white'}
									bg={'red.500'}
									fontWeight={'bold'}
									borderRadius={'full'}
									textTransform={'none'}
									fontSize={isMobile ? 'xs' : 'sm'}
								>
									Inactive
								</Badge>
							)}

							<Badge
								px={2} py={1}
								color={'white'}
								bg={'alpha500'}
								fontWeight={'bold'}
								borderRadius={'full'}
								textTransform={'none'}
								fontSize={isMobile ? 'xs' : 'sm'}
							>
								{role}
							</Badge>
						</HStack>
					</HStack>

					<HStack spacing={2} flexWrap='wrap'>
						{expiresAt && (
							<Text fontSize='sm' color='gray.500'>
								{isExpired ? 'Expired' : formatExpiresIn(new Date(expiresAt))}
							</Text>
						)}
						<Text fontSize='sm' color='gray.500'>
							• {uses}/{maxUses} uses
						</Text>
					</HStack>
				</VStack>
			</Flex>

			<Flex
				alignItems={'center'}
				justifyContent={isMobile ? 'center' : 'flex-end'}
				gap={2}
				mt={isMobile ? 2 : 0}
				w={isMobile ? '100%' : 'auto'}
			>
				<HStack spacing={1} w={isMobile ? '100%' : 'auto'} justify={isMobile ? 'center' : 'flex-start'}>
					{onDelete && canManage && (
						<IconButton
							onClick={onConfirmOpen}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							colorScheme='gray'
							size={buttonSize}
							aria-label={'Delete invite'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}

					<IconButton
						onClick={onDetails}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						icon={<FaEye />}
						colorScheme='gray'
						size={buttonSize}
						aria-label={'View invite details'}
						alignItems={'center'}
						justifyContent={'center'}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
					/>

					<IconButton
						onClick={copyInviteLink}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						icon={<FaCopy />}
						colorScheme='gray'
						size={buttonSize}
						aria-label={'Copy invite link'}
						alignItems={'center'}
						justifyContent={'center'}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
					/>
				</HStack>
			</Flex>

			<ConfirmModal
				isOpen={isConfirmOpen}
				onClose={onConfirmClose}
				onConfirm={() => {
					onDelete?.();
					onConfirmClose();
				}}
				title='Delete Invite'
				message={'Are you sure you want to delete this invite?\nThis action cannot be undone.'}
				confirmText='Delete'
				colorScheme='red'
			/>
		</Flex>
	);
}

export type NoInviteCardProps = {
	noWhat: string;
};

export function NoInviteCard({
	noWhat,
}: NoInviteCardProps) {
	const textSize = useBreakpointValue({ base: 'xl', md: '2xl' });
	const padding = useBreakpointValue({ base: 6, md: 4 });

	return (
		<Flex
			p={padding}
			w={'100%'}
			rounded={'lg'}
			bg={'alpha100'}
			alignItems={'center'}
			justifyContent={'center'}
			transition={'all 0.3s ease'}
		>
			<Text fontSize={textSize} fontWeight={'bold'} textAlign='center'>
				No {noWhat}.
			</Text>
		</Flex>
	);
}
