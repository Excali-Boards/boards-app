import { Flex, Text, HStack, Divider, IconButton, FlexProps, useColorMode, Badge, useBreakpointValue, Tooltip } from '@chakra-ui/react';
import { FaLink, FaPen, FaTrash, FaTrashRestore, FaUsers } from 'react-icons/fa';
import { formatBytes, getCardDeletionTime } from '~/other/utils';
import { IconLinkButton } from '~/components/Button';
import { IoFlash } from 'react-icons/io5';
import { useState } from 'react';

export type CardProps = {
	id: string;
	url: string;
	name: string;

	permsUrl?: string;
	editorMode?: boolean;

	flashUrl?: string;
	flashExists?: boolean;

	refresh?: boolean;
	sizeBytes?: number;
	isDeleteDisabled?: boolean;
	isScheduledForDeletion?: Date;

	onCancelDeletion?: () => void;
	onFlashCreate?: () => void;
	onDelete?: () => void;
	onEdit?: () => void;
};

export function Card({
	url,
	name,
	refresh,
	permsUrl,
	flashUrl,
	sizeBytes,
	editorMode,
	flashExists,
	isDeleteDisabled,
	isScheduledForDeletion,
	onCancelDeletion,
	onFlashCreate,
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
						<Tooltip label='Restore' hasArrow>
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
						</Tooltip>
					)}

					{onDelete && !isScheduledForDeletion && (
						<Tooltip label='Delete' hasArrow>
							<IconButton
								onClick={onDelete}
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								icon={<FaTrash />}
								aria-label={'Delete'}
								alignItems={'center'}
								justifyContent={'center'}
								_hover={{ bg: 'alpha300' }}
								isDisabled={isDeleteDisabled}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Tooltip>
					)}

					{onEdit && (
						<Tooltip label='Edit' hasArrow>
							<IconButton
								onClick={onEdit}
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								aria-label={'Edit'}
								icon={<FaPen />}
								alignItems={'center'}
								justifyContent={'center'}
								_hover={{ bg: 'alpha300' }}
								isDisabled={!!isScheduledForDeletion}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Tooltip>
					)}

					{permsUrl && editorMode && (
						<Tooltip label='Manage Permissions' hasArrow>
							<span>
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
							</span>
						</Tooltip>
					)}

					{flashExists && flashUrl && editorMode && (
						<Tooltip label='Manage Flashcards' hasArrow>
							<span>
								<IconLinkButton
									to={flashUrl + '/manage'}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									icon={<IoFlash />}
									alignItems={'center'}
									reloadDocument={refresh}
									justifyContent={'center'}
									_hover={{ bg: 'alpha300' }}
									aria-label={'Manage Flashcards'}
									_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									onClick={() => setIsLoading(true)}
									isLoading={isLoading}
								/>
							</span>
						</Tooltip>
					)}

					{!flashExists && editorMode && onFlashCreate && (
						<Tooltip label='Initialize Flashcards' hasArrow>
							<IconButton
								onClick={onFlashCreate}
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								icon={<IoFlash />}
								alignItems={'center'}
								justifyContent={'center'}
								_hover={{ bg: 'alpha300' }}
								aria-label={'Create Flashcards'}
							/>
						</Tooltip>
					)}

					{flashExists && flashUrl && !editorMode && (
						<Tooltip label='Flashcards' hasArrow>
							<span>
								<IconLinkButton
									to={flashUrl}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									icon={<IoFlash />}
									alignItems={'center'}
									reloadDocument={refresh}
									justifyContent={'center'}
									_hover={{ bg: 'alpha300' }}
									aria-label={'View Flashcards'}
									_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									onClick={() => setIsLoading(true)}
									isLoading={isLoading}
								/>
							</span>
						</Tooltip>
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
