import { Flex, Text, HStack, Divider, IconButton, FlexProps, useColorMode, Badge, useBreakpointValue } from '@chakra-ui/react';
import { FaLink, FaPen, FaTrash, FaTrashRestore, FaUsers } from 'react-icons/fa';
import { formatBytes, getCardDeletionTime } from '~/other/utils';
import { IconLinkButton } from '~/components/Button';
import { useState } from 'react';

export type CardProps = {
	id: string;
	url: string;
	name: string;

	permsUrl?: string;
	editorMode?: boolean;
	canManageAnything?: boolean;

	refresh?: boolean;
	sizeBytes?: number;
	isDeleteDisabled?: boolean;
	isScheduledForDeletion?: Date;

	onCancelDeletion?: () => void;
	onDelete?: () => void;
	onEdit?: () => void;
};

export function Card({
	url,
	name,
	refresh,
	permsUrl,
	sizeBytes,
	editorMode,
	isDeleteDisabled,
	isScheduledForDeletion,
	canManageAnything,
	onCancelDeletion,
	onDelete,
	onEdit,
}: CardProps & FlexProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { colorMode } = useColorMode();

	const isDeletedSoon = getCardDeletionTime(isScheduledForDeletion || null, colorMode);
	const isMobile = useBreakpointValue({ base: true, md: false }) || false;

	return (
		<Flex
			gap={4}
			w={'100%'}
			py={4} px={6}
			rounded={'lg'}
			height={'100%'}
			alignItems={'center'}
			bg={isDeletedSoon.bg}
			wordBreak={'break-word'}
			transition={'all 0.3s ease'}
			justifyContent={'space-between'}
			_hover={{ bg: isDeletedSoon.borderColor }}
			flexDirection={editorMode ? { base: 'column', md: 'row' } : 'row'}
		>
			<Flex
				justifyContent='center'
				alignItems={{ base: editorMode ? 'center' : 'start', md: 'start' }}
				textAlign={{ base: editorMode ? 'center' : 'start', md: 'start' }}
				flexDir='column'
				flexGrow={1}
			>
				<Text fontSize={'2xl'} fontWeight={'bold'}>{name}</Text>
			</Flex>

			{isScheduledForDeletion && (
				<Badge
					px={2} py={1}
					borderRadius={'full'}
					textTransform={'none'}
					bg={isDeletedSoon.borderColor}
					color={colorMode === 'light' ? 'white' : 'black'}
				>
					{isDeletedSoon.text}
				</Badge>
			)}

			{typeof sizeBytes === 'number' && (
				<Badge
					px={2} py={1}
					color={'white'}
					bg={'alpha500'}
					borderRadius={'full'}
					textTransform={'none'}
				>
					{formatBytes(sizeBytes)}
				</Badge>
			)}

			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				<Divider orientation={'vertical'} color={'red'} height={'50px'} display={isMobile && editorMode ? 'none' : 'block'} />

				<HStack spacing={2}>
					{onCancelDeletion && isScheduledForDeletion && (
						<IconButton
							onClick={onCancelDeletion}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrashRestore />}
							colorScheme='blue'
							aria-label={'Cancel deletion'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}

					{onDelete && !isScheduledForDeletion && (
						<IconButton
							onClick={onDelete}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							colorScheme='red'
							aria-label={'Delete'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							isDisabled={isDeleteDisabled}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}

					{onEdit && (
						<IconButton
							onClick={onEdit}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							aria-label={'Edit'}
							icon={<FaPen />}
							colorScheme='orange'
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							isDisabled={!!isScheduledForDeletion}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						/>
					)}

					{(permsUrl || canManageAnything) && editorMode && (
						<IconLinkButton
							to={permsUrl || '#'}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaUsers />}
							alignItems={'center'}
							isDisabled={!permsUrl}
							reloadDocument={refresh}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							aria-label={'Manage Permissions'}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							onClick={() => setIsLoading(true)}
							isLoading={isLoading}
						/>
					)}

					<IconLinkButton
						to={url}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						icon={<FaLink />}
						aria-label={'Open'}
						alignItems={'center'}
						reloadDocument={refresh}
						justifyContent={'center'}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
						onClick={() => setIsLoading(true)}
						isLoading={isLoading}
					/>
				</HStack>
			</Flex>
		</Flex>
	);
}

export type NoCardProps = {
	noWhat: string;
};

export function NoCard({ noWhat }: NoCardProps) {
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
