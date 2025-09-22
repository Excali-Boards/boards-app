import { Flex, Text, HStack, Divider, IconButton, FlexProps, Badge, useToast, useDisclosure } from '@chakra-ui/react';
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
			gap={4}
			w={'100%'}
			py={4} px={6}
			rounded={'lg'}
			height={'100%'}
			alignItems={'center'}
			bg={isExpired || isMaxUsed ? 'red.50' : 'alpha100'}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			justifyContent={'space-between'}
			_hover={{ bg: isExpired || isMaxUsed ? 'red.100' : 'alpha200' }}
		>
			<Flex
				justifyContent='center'
				alignItems='start'
				textAlign='start'
				flexDir='column'
				flexGrow={1}
			>
				<HStack spacing={3} align='center'>
					<Text fontSize={'2xl'} fontWeight={'bold'}>
						{code}
					</Text>
				</HStack>

				<HStack spacing={2} mt={1}>
					{expiresAt && (
						<Text fontSize='sm' color='gray.500'>
							{isExpired ? 'Expired' : formatExpiresIn(new Date(expiresAt))}
						</Text>
					)}
					<Text fontSize='sm' color='gray.500'>
						• {uses}/{maxUses} uses
					</Text>
				</HStack>
			</Flex>

			{(isExpired || isMaxUsed) && (
				<Badge
					px={2} py={1}
					color={'white'}
					bg={'red.500'}
					fontWeight={'bold'}
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
				fontWeight={'bold'}
				borderRadius={'full'}
				textTransform={'none'}
			>
				{role}
			</Badge>

			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				<Divider orientation={'vertical'} color={'red'} height={'50px'} />

				<HStack spacing={2}>
					{onDelete && canManage && (
						<IconButton
							onClick={onConfirmOpen}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							colorScheme='gray'
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
	return (
		<Flex
			p={4}
			w={'100%'}
			rounded={'lg'}
			bg={'alpha100'}
			alignItems={'center'}
			justifyContent={'center'}
			transition={'all 0.3s ease'}
		>
			<Text fontSize={'2xl'} fontWeight={'bold'}>No {noWhat}.</Text>
		</Flex>
	);
}
