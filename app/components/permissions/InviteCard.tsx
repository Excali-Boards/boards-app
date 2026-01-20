import { Flex, Text, HStack, VStack, IconButton, FlexProps, Badge, useToast, useDisclosure, useBreakpointValue, Divider, Tooltip } from '@chakra-ui/react';
import { FaTrash, FaCopy, FaEye, FaQrcode } from 'react-icons/fa';
import { ConfirmModal } from '../other/ConfirmModal';
import { Fragment, useCallback } from 'react';

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
	onQrCode?: () => void;
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
	onQrCode,
}: InviteCardProps & FlexProps) {
	const toast = useToast();
	const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

	const isMobile = useBreakpointValue({ base: true, md: false });
	const cardPadding = useBreakpointValue({ base: 4, md: 6 });
	const cardDirection = useBreakpointValue({ base: 'column', md: 'row' }) as 'column' | 'row';
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

	const formatExpiresIn = (date: Date) => {
		const now = new Date();
		const diff = date.getTime() - now.getTime();

		if (diff <= 0) return 'Expired';

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const weeks = Math.floor(days / 7);
		const months = Math.floor(days / 30);
		const years = Math.floor(days / 365);

		if (years > 0) return `Expires in ${years} year${years > 1 ? 's' : ''}${months % 12 > 0 ? `, ${months % 12} month${months % 12 > 1 ? 's' : ''}` : ''}${days % 30 > 0 ? `, ${days % 30} day${days % 30 > 1 ? 's' : ''}` : ''}`;
		if (months > 0) return `Expires in ${months} month${months > 1 ? 's' : ''}${days % 30 > 0 ? `, ${days % 30} day${days % 30 > 1 ? 's' : ''}` : ''}${hours % 24 > 0 ? `, ${hours % 24} hour${hours % 24 > 1 ? 's' : ''}` : ''}`;
		if (weeks > 0) return `Expires in ${weeks} week${weeks > 1 ? 's' : ''}${days % 7 > 0 ? `, ${days % 7} day${days % 7 > 1 ? 's' : ''}` : ''}${hours % 24 > 0 ? `, ${hours % 24} hour${hours % 24 > 1 ? 's' : ''}` : ''}`;
		if (days > 0) return `Expires in ${days} day${days > 1 ? 's' : ''}${hours % 24 > 0 ? `, ${hours % 24} hour${hours % 24 > 1 ? 's' : ''}` : ''}${minutes % 60 > 0 ? `, ${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}` : ''}`;
		if (hours > 0) return `Expires in ${hours} hour${hours > 1 ? 's' : ''}${minutes % 60 > 0 ? `, ${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}` : ''}${seconds % 60 > 0 ? `, ${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}` : ''}`;
		if (minutes > 0) return `Expires in ${minutes} minute${minutes > 1 ? 's' : ''}${seconds % 60 > 0 ? `, ${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}` : ''}`;
		return `Expires in ${seconds} second${seconds !== 1 ? 's' : ''}`;
	};

	const badges = (
		<HStack spacing={2} flexShrink={0}>
			{isExpired && (
				<Badge
					px={2} py={1}
					color={'white'}
					bg={'red.500'}
					borderRadius={'full'}
					textTransform={'none'}
				>
					Inactive
				</Badge>
			)}

			<Badge
				px={2} py={1}
				color={'white'}
				bg={'alpha500'}
				borderRadius={'full'}
				textTransform={'none'}
			>
				{role}
			</Badge>
		</HStack>
	);

	return (
		<Flex
			gap={isMobile ? 2 : 3}
			w={'100%'}
			py={cardPadding}
			px={cardPadding}
			rounded={'lg'}
			height={'100%'}
			alignItems={isMobile ? 'stretch' : 'center'}
			bg={isExpired ? 'red.50' : 'alpha100'}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			flexDirection={cardDirection}
			justifyContent={'space-between'}
			_hover={{ bg: isExpired ? 'red.100' : 'alpha200' }}
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
							fontSize='xl'
							overflow='hidden'
							fontWeight='bold'
							whiteSpace='nowrap'
							textOverflow='ellipsis'
							maxW={isMobile ? '60%' : 'none'}
						>
							{code}
						</Text>

						{isMobile && badges}
					</HStack>

					<HStack spacing={isMobile ? 1 : 2} flexWrap='wrap'>
						{expiresAt && (
							<Text fontSize='sm' color='gray.500'>
								{isMobile ? ' • ' : ''}{isExpired ? 'Expired' : formatExpiresIn(new Date(expiresAt))}
							</Text>
						)}

						{!isMobile && <Text fontSize='sm' color='gray.500'> • </Text>}

						<Text fontSize='sm' color='gray.500'>
							{isMobile ? ' • ' : ''}{uses}/{maxUses} uses
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
				{!isMobile && (
					<Fragment>
						{badges}

						<Divider orientation='vertical' height={'50px'} mx={2} />
					</Fragment>
				)}

				<HStack spacing={1} w={isMobile ? '100%' : 'auto'} justify={isMobile ? 'center' : 'flex-start'}>
					{onDelete && (
						<Tooltip label='Delete invite' hasArrow>
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
								isDisabled={!canManage}
								_hover={{ bg: 'alpha300' }}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Tooltip>
					)}

					<Tooltip label='View details' hasArrow>
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
					</Tooltip>

					<Tooltip label='Show QR Code' hasArrow>
						<IconButton
							onClick={onQrCode}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaQrcode />}
							colorScheme='gray'
							size={buttonSize}
							aria-label={'Show QR Code'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					</Tooltip>

					<Tooltip label='Copy invite link' hasArrow>
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
					</Tooltip>
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
