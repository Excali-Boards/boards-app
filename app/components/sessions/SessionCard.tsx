import { Flex, Text, HStack, VStack, IconButton, FlexProps, Badge, useBreakpointValue } from '@chakra-ui/react';
import { FaDesktop, FaGlobe, FaMobileAlt, FaQuestionCircle, FaTabletAlt, FaTrash } from 'react-icons/fa';
import { Device } from '@excali-boards/boards-api-client/prisma/generated/client';
import { Fragment, useCallback } from 'react';

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
	const isMobile = useBreakpointValue({ base: true, md: false });
	const cardPadding = useBreakpointValue({ base: 4, md: 6 });
	const tokenTextSize = useBreakpointValue({ base: 'xl', md: '2xl' });
	const buttonSize = useBreakpointValue({ base: 'md', md: 'md' });

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
			gap={isMobile ? 3 : 4}
			w={'100%'}
			py={cardPadding}
			px={cardPadding}
			rounded={'lg'}
			height={'100%'}
			alignItems={'center'}
			bg={isExpired ? 'red.50' : 'alpha100'}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			flexDirection={'row'}
			justifyContent={'space-between'}
			_hover={{ bg: isExpired ? 'red.100' : 'alpha200' }}
		>
			{isMobile ? (
				<Fragment>
					<DeviceIcon />

					<VStack spacing={2} align='stretch' flex={1} minW={0}>
						<HStack spacing={2} justify='space-between' align='center' w='100%'>
							<Text
								fontSize={tokenTextSize}
								fontWeight={'bold'}
								overflow='hidden'
								textOverflow='ellipsis'
								whiteSpace='nowrap'
								flex={1}
							>
								{tokenPreview}
							</Text>

							<HStack spacing={1} flexShrink={0}>
								{isCurrent && (
									<Badge
										px={2} py={1}
										fontWeight={'bold'}
										borderRadius={'full'}
										textTransform={'none'}
										color={'white'}
										bg='blue.300'
										fontSize='xs'
									>
										Current
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
										fontSize='xs'
									>
										Expired
									</Badge>
								)}
							</HStack>
						</HStack>

						<HStack spacing={2} justify='space-between' align='center' w='100%'>
							<VStack spacing={2} align='flex-start' flex={1}>
								{location && (
									<Text fontSize='sm' color='gray.400'>
										{location}
									</Text>
								)}

								<Flex flexDirection={'column'}>
									<Text fontSize='sm' color='gray.500'>
										Created {formatRelativeTime(createdAt)}
									</Text>
									<Text fontSize='sm' color='gray.500'>
										Last active {formatRelativeTime(lastUsed)}
									</Text>
								</Flex>
							</VStack>

							{onDelete && (
								<IconButton
									onClick={onDelete}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									icon={<FaTrash />}
									colorScheme='gray'
									size={buttonSize}
									aria-label={'Delete session'}
									flexShrink={0}
									_hover={{ bg: 'alpha300' }}
									_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
								/>
							)}
						</HStack>
					</VStack>
				</Fragment>
			) : (
				<Fragment>
					<Flex
						justifyContent='flex-start'
						alignItems='flex-start'
						textAlign='start'
						flexDir='column'
						flexGrow={1}
						minW={0}
					>
						<HStack spacing={3} align='center'>
							<DeviceIcon />
							<Text fontSize={'2xl'} fontWeight={'bold'}>
								{tokenPreview}
							</Text>
							{location && (
								<Text fontSize='sm' color='gray.400'>
									{location}
								</Text>
							)}
						</HStack>

						<HStack spacing={2}>
							<Text fontSize='sm' color='gray.500'>
								Created {formatRelativeTime(createdAt)} • Last active {formatRelativeTime(lastUsed)}
							</Text>
							<Text fontSize='sm' color='gray.500'>
								• {isExpired ? 'Expired' : formatExpiresIn(expiresAt)}
							</Text>
						</HStack>
					</Flex>

					<HStack spacing={2}>
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
					</HStack>

					{onDelete && (
						<IconButton
							onClick={onDelete}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							colorScheme='gray'
							size={buttonSize}
							aria-label={'Delete session'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}
				</Fragment>
			)}
		</Flex>
	);
}

export type NoSessionCardProps = {
	noWhat: string;
};

export function NoSessionCard({
	noWhat,
}: NoSessionCardProps) {
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
