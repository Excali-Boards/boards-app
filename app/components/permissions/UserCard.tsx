import { Flex, Text, HStack, Divider, IconButton, FlexProps, Badge, Avatar, useBreakpointValue } from '@chakra-ui/react';
import { UserRole } from '@excali-boards/boards-api-client';
import { getGrantInfo, getRoleColor } from '~/other/utils';
import { FaTrash } from 'react-icons/fa';

export type UserCardProps = {
	id: string;
	userId: string;
	username: string;
	avatar?: string;
	role: UserRole;
	grantType: 'explicit' | 'implicit';
	basedOnType?: string | null;
	canManage?: boolean;
	onRevoke?: () => void;
};

export function UserCard({
	id,
	username,
	avatar,
	role,
	grantType,
	canManage,
	onRevoke,
}: UserCardProps & FlexProps) {
	const isMobile = useBreakpointValue({ base: true, md: false }) || false;

	if (isMobile) {
		return (
			<Flex
				gap={4}
				w={'100%'}
				py={4} px={6}
				rounded={'lg'}
				height={'100%'}
				bg={'alpha100'}
				wordBreak={'break-word'}
				transition={'all 0.3s ease'}
				_hover={{ bg: 'alpha200' }}
				flexDirection={'column'}
			>
				<Flex
					w={'100%'}
					alignItems={'center'}
					justifyContent={'space-between'}
					gap={4}
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
								overflow={'hidden'}
								minW={0}
							>
								<Text fontSize={'2xl'} fontWeight={'bold'} isTruncated w={'100%'}>{username}</Text>
								<Text fontSize={'lg'} fontWeight={'bold'} color={'gray.500'} isTruncated w={'100%'}>({id})</Text>
							</Flex>
						</HStack>
					</Flex>

					<IconButton
						onClick={onRevoke}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						icon={<FaTrash />}
						colorScheme='red'
						isDisabled={!canManage}
						aria-label={'Revoke permission'}
						alignItems={'center'}
						justifyContent={'center'}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						flexShrink={0}
					/>
				</Flex>

				<HStack spacing={2} flexWrap={'wrap'} justifyContent={'center'} w={'100%'}>
					<Badge
						px={2} py={1}
						color={'white'}
						borderRadius={'full'}
						textTransform={'none'}
						bg={getRoleColor(role)}
					>
						{role}
					</Badge>
					<Badge
						px={2} py={1}
						color={'white'}
						borderRadius={'full'}
						textTransform={'none'}
						bg={getGrantInfo(grantType).color}
					>
						{getGrantInfo(grantType).label}
					</Badge>
				</HStack>
			</Flex>
		);
	}

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
					<Avatar name={username} src={avatar || '/logo.webp'} />
					<Flex
						justifyContent={'center'}
						alignItems={'start'}
						flexDir={'column'}
					>
						<Text fontSize={'xl'} fontWeight={'bold'}>{username}</Text>
						<Text fontWeight={'bold'} color={'gray.500'}>({id})</Text>
					</Flex>
				</HStack>
			</Flex>

			<HStack spacing={2}>
				<Badge
					px={2} py={1}
					color={'white'}
					borderRadius={'full'}
					textTransform={'none'}
					bg={getRoleColor(role)}
				>
					{role}
				</Badge>
				<Badge
					px={2} py={1}
					color={'white'}
					borderRadius={'full'}
					textTransform={'none'}
					bg={getGrantInfo(grantType).color}
				>
					{getGrantInfo(grantType).label}
				</Badge>
			</HStack>

			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				<Divider orientation={'vertical'} color={'red'} height={'50px'} />

				<HStack spacing={2}>
					<IconButton
						onClick={onRevoke}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						icon={<FaTrash />}
						aria-label={'Revoke permission'}
						alignItems={'center'}
						isDisabled={!canManage}
						justifyContent={'center'}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
					/>
				</HStack>
			</Flex>
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
