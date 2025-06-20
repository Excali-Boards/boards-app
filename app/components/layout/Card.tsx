import { Flex, Text, HStack, Divider, IconButton, FlexProps, useColorMode, Badge } from '@chakra-ui/react';
import { FaLink, FaPen, FaSync, FaTrash, FaTrashRestore } from 'react-icons/fa';
import { formatBytes, getCardDeletionTime } from '~/other/utils';
import { IconLinkButton } from '~/components/Button';
import { useContext, useState } from 'react';
import { RootContext } from '../Context';

export type CardProps = ({
	id: string;
	name: string;
	refresh?: boolean;
	sizeBytes?: number;
	isDeleteDisabled?: boolean;
	isScheduledForDeletion?: Date;
	onCancelDeletion?: () => void;
	onDelete?: () => void;
	onEdit?: () => void;
}) & ({
	url: string;
} | {
	onClick: () => void;
});

export function Card({
	refresh,
	sizeBytes,
	isDeleteDisabled,
	isScheduledForDeletion,
	onCancelDeletion,
	onDelete,
	onEdit,
	name,
	...rest
}: CardProps & FlexProps) {
	const isDeletedSoon = getCardDeletionTime(isScheduledForDeletion || null);
	const { sortType } = useContext(RootContext) || { sortType: 'list' };

	const [isLoading, setIsLoading] = useState(false);
	const { colorMode } = useColorMode();

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
			flexDirection={sortType === 'list' ? 'row' : 'column'}
			{...rest}
		>
			<Flex
				alignItems={{ base: sortType === 'grid' ? 'center' : 'start', md: 'start' }}
				textAlign={{ base: sortType === 'grid' ? 'center' : 'start', md: 'start' }}
				justifyContent={'center'}
				flexDir={'column'}
				flexGrow={1}
			>
				<Text fontSize={'2xl'} fontWeight={'bold'}>{name}</Text>
			</Flex>

			{isScheduledForDeletion && (
				<Badge
					px={2} py={1}
					fontWeight={'bold'}
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
					fontWeight={'bold'}
					borderRadius={'full'}
					textTransform={'none'}
					bg={colorMode === 'light' ? 'alpha500' : 'alpha300'}
					color={colorMode === 'light' ? 'white' : 'black'}
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
				{sortType === 'list' && <Divider orientation={'vertical'} color={'red'} height={'50px'} />}
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

					{'url' in rest ? (
						<IconLinkButton
							to={rest.url}
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
					) : 'onClick' in rest ? (
						<IconButton
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaSync />}
							aria-label={'Open'}
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							isLoading={isLoading}
							onClick={() => {
								setIsLoading(true);
								rest.onClick();
							}}
						/>
					) : <></>}
				</HStack>
			</Flex>
		</Flex>
	);
}

export type NoCardProps = {
	noWhat: string;
};

export function NoCard({
	noWhat,
}: NoCardProps) {
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
