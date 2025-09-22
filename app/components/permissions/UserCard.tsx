import { Flex, Text, HStack, Divider, IconButton, FlexProps, Badge, Avatar, useDisclosure } from '@chakra-ui/react';
import { UserRole } from '@excali-boards/boards-api-client';
import { ConfirmModal } from '../other/ConfirmModal';
import { FaTrash } from 'react-icons/fa';

export type UserCardProps = {
	id: string;
	userId: string;
	username: string;
	avatar?: string;

	role: UserRole;
	basedOnType?: string | null;

	canManage?: boolean;
	onRevoke?: () => void;
};

export function UserCard({
	id,
	username,
	avatar,
	role,
	basedOnType,
	canManage,
	onRevoke,
}: UserCardProps & FlexProps) {
	const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();

	const getRoleColor = (role: UserRole) => {
		switch (role) {
			case 'BoardViewer':
			case 'CategoryViewer':
			case 'GroupViewer':
				return 'blue.300';
			case 'BoardCollaborator':
			case 'CategoryCollaborator':
			case 'GroupCollaborator':
				return 'purple.300';
			case 'CategoryManager':
			case 'GroupManager':
				return 'yellow.300';
			case 'CategoryAdmin':
			case 'GroupAdmin':
				return 'red.300';
			default:
				return 'gray.300';
		}
	};

	return (
		<Flex
			gap={4}
			w={'100%'}
			py={4} px={6}
			rounded={'lg'}
			height={'100%'}
			alignItems={'center'}
			bg={'alpha100'}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			justifyContent={'space-between'}
			_hover={{ bg: 'alpha200' }}
		>
			<Flex
				justifyContent='center'
				alignItems='start'
				textAlign='start'
				flexDir='column'
				flexGrow={1}
			>
				<HStack spacing={3}>
					<Avatar size={'lg'} name={username} src={avatar || '/logo.webp'} />

					<Flex
						justifyContent={'center'}
						alignItems={'start'}
						flexDir={'column'}
					>
						<Text fontSize={'2xl'} fontWeight={'bold'}>{username}</Text>
						<Text fontSize={'lg'} fontWeight={'bold'} color={'gray.500'}>({id})</Text>
					</Flex>
				</HStack>
			</Flex>

			<Badge
				px={2} py={1}
				color={'white'}
				fontWeight={'bold'}
				borderRadius={'full'}
				textTransform={'none'}
				bg={getRoleColor(role)}
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
					{onRevoke && canManage && (
						<IconButton
							onClick={onConfirmOpen}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							aria-label={'Revoke permission'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}
				</HStack>
			</Flex>

			<ConfirmModal
				isOpen={isConfirmOpen}
				onClose={onConfirmClose}
				onConfirm={() => {
					onRevoke?.();
					onConfirmClose();
				}}
				title='Revoke Access'
				message={`Are you sure you want to revoke this user's access?${basedOnType ? `\nThis will revoke their access to the ${basedOnType} parent too.` : ''}\nThis action cannot be undone.`}
				confirmText='Revoke'
				colorScheme='red'
			/>
		</Flex>
	);
}

export type NoUserCardProps = {
	noWhat: string;
};

export function NoUserCard({
	noWhat,
}: NoUserCardProps) {
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
