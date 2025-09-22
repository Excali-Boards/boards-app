import { FaDesktop, FaGlobe, FaMobileAlt, FaQuestionCircle, FaTabletAlt, FaTrash } from 'react-icons/fa';
import { Flex, Text, HStack, Divider, IconButton, FlexProps, Badge } from '@chakra-ui/react';
import { Device } from '@excali-boards/boards-api-client/prisma/generated/client';
import { useCallback } from 'react';

export type SessionCardProps = {
	tokenPreview: string;
	expiresAt: string;
	location: string | null;
	device: Device | null;
	createdAt: string;
	lastUsed: string;
	isCurrent?: boolean;
	onDelete?: () => void;
};

export function SessionCard({
	tokenPreview,
	expiresAt,
	location,
	device,
	createdAt,
	lastUsed,
	isCurrent,
	onDelete,
}: SessionCardProps & FlexProps) {
	const formatRelativeTime = (date: Date | string) => {
		const now = new Date();
		const then = new Date(date);
		const diffMs = now.getTime() - then.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor(diffMs / (1000 * 60));

		if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
		if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
		return 'just now';
	};

	const formatExpiresIn = (date: Date | string) => {
		const now = new Date();
		const expiry = new Date(date);
		const diffMs = expiry.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays <= 0) return 'Expired';
		if (diffDays === 1) return 'Expires in 1 day';
		return `Expires in ${diffDays} days`;
	};

	const isExpired = new Date(expiresAt) < new Date();

	const DeviceIcon = useCallback(() => {
		if (!device) return <FaGlobe />;


		switch (device) {
			case 'Desktop': return <FaDesktop />;
			case 'Mobile': return <FaMobileAlt />;
			case 'Tablet': return <FaTabletAlt />;
			case 'Other': return <FaQuestionCircle />;
			default: return <FaGlobe />;
		}
	}, [device]);

	return (
		<Flex
			gap={4}
			w={'100%'}
			py={4} px={6}
			rounded={'lg'}
			height={'100%'}
			alignItems={'center'}
			bg={isExpired ? 'red.50' : 'alpha100'}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			justifyContent={'space-between'}
			_hover={{ bg: isExpired ? 'red.100' : 'alpha200' }}
		>
			<Flex
				justifyContent='center'
				alignItems='start'
				textAlign='start'
				flexDir='column'
				flexGrow={1}
			>
				<HStack spacing={3} align='center'>
					<DeviceIcon />
					<Text fontSize={'2xl'} fontWeight={'bold'}>
						{tokenPreview}
					</Text>
					<Text fontSize='sm' color='gray.400'>
						{location}
					</Text>
				</HStack>

				<HStack spacing={2} mt={1}>
					<Text fontSize='sm' color='gray.500'>
						Created {formatRelativeTime(createdAt)} • Last active {formatRelativeTime(lastUsed)}
					</Text>
					<Text fontSize='sm' color='gray.500'>
						• {isExpired ? 'Expired' : formatExpiresIn(expiresAt)}
					</Text>
				</HStack>
			</Flex>

			{isCurrent && (
				<Badge
					px={2} py={1}
					fontWeight={'bold'}
					borderRadius={'full'}
					textTransform={'none'}
					color={'white'}
					bg='blue.300'
				>
					Current Session
				</Badge>
			)}

			{isExpired && (
				<Badge
					px={2} py={1}
					color={'white'}
					bg={'red.500'}
					fontWeight={'bold'}
					borderRadius={'full'}
					textTransform={'none'}
				>
					Expired
				</Badge>
			)}

			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				<Divider orientation={'vertical'} color={'red'} height={'50px'} />

				<HStack spacing={2}>
					{onDelete && (
						<IconButton
							onClick={onDelete}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							colorScheme='gray'
							aria-label={'Delete session'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}
				</HStack>
			</Flex>
		</Flex>
	);
}

export type NoSessionCardProps = {
	noWhat: string;
};

export function NoSessionCard({
	noWhat,
}: NoSessionCardProps) {
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
