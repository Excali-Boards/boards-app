import { Box, Flex, Text, HStack, Divider, IconButton, FlexProps, useColorMode, Badge, useBreakpointValue, Tooltip, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FaLink, FaList, FaPen, FaTrash, FaTrashRestore, FaUsers, FaChartBar } from 'react-icons/fa';
import { FaRightLeft } from 'react-icons/fa6';
import { formatBytes, getCardDeletionTime } from '~/other/utils';
import { Fragment, useContext, useState } from 'react';
import { IconLinkButton } from '~/components/Button';
import { IoFlash } from 'react-icons/io5';
import { RootContext } from '../Context';

export type CardProps = {
	id: string;
	url: string;
	name: string;

	permsUrl?: string;
	analyticsUrl?: string;

	hasPerms?: boolean;
	editorMode?: boolean;

	flashUrl?: string;
	flashExists?: boolean;

	refresh?: boolean;
	sizeBytes?: number;
	isDeleteDisabled?: boolean;

	isScheduledForDeletion?: Date;
	isScheduledForDeletionText?: string;

	onCancelDeletion?: () => void;
	onForceDelete?: () => void;
	onFlashCreate?: () => void;
	onRestore?: () => void;
	onDelete?: () => void;
	onMove?: () => void;
	onEdit?: () => void;
};

export function Card({
	url,
	name,
	refresh,
	permsUrl,
	analyticsUrl,
	flashUrl,
	hasPerms,
	sizeBytes,
	editorMode,
	flashExists,
	isDeleteDisabled,
	isScheduledForDeletion,
	isScheduledForDeletionText,
	onCancelDeletion,
	onForceDelete,
	onFlashCreate,
	onDelete,
	onMove,
	onEdit,
}: CardProps & FlexProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { colorMode } = useColorMode();
	const actionBoxSize = 10;

	const { user } = useContext(RootContext) || {};

	const isDeletedSoon = getCardDeletionTime(isScheduledForDeletion || null, colorMode);
	const isMobile = useBreakpointValue({ base: true, md: false }) || false;
	const canShowEditorActions = Boolean(editorMode && hasPerms);
	const canShowRestore = canShowEditorActions && Boolean(onCancelDeletion && isScheduledForDeletion);
	const canShowDelete = canShowEditorActions && Boolean(onDelete && !isScheduledForDeletion);
	const canShowEdit = canShowEditorActions && Boolean(onEdit);
	const canShowMove = canShowEditorActions && Boolean(onMove);
	const canShowAnalytics = Boolean(analyticsUrl);
	const canShowPerms = Boolean(editorMode && permsUrl);
	const canShowFlash = Boolean((flashExists && flashUrl) || (editorMode && onFlashCreate));
	const shouldKeepActionSlots = Boolean(editorMode);
	const hasDeleteSlot = Boolean(onDelete || onCancelDeletion);
	const hasEditSlot = Boolean(onEdit);
	const hasMoveSlot = Boolean(onMove);
	const hasAnalyticsSlot = Boolean(analyticsUrl);
	const hasPermsSlot = Boolean(permsUrl);
	const hasFlashSlot = Boolean((flashExists && flashUrl) || onFlashCreate);
	const stableSlotCount = [
		hasDeleteSlot,
		hasEditSlot,
		hasMoveSlot,
		hasAnalyticsSlot,
		hasPermsSlot,
		hasFlashSlot,
		true,
	].filter(Boolean).length;
	const actionAreaMinWidth = stableSlotCount > 0 ? `${(stableSlotCount * 40) + ((stableSlotCount - 1) * 8)}px` : 'auto';

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
			transition={'background-color 0.2s ease, border-color 0.2s ease'}
			justifyContent={'space-between'}
			_hover={{ bg: isDeletedSoon.borderColor }}
			flexDirection={{ base: 'column', md: 'row' }}
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

			{isScheduledForDeletion && isScheduledForDeletionText && (
				<Badge
					px={2} py={1}
					borderRadius={'full'}
					textTransform={'none'}
					bg={isDeletedSoon.borderColor}
					color={colorMode === 'light' ? 'white' : 'black'}
				>
					{isScheduledForDeletionText}
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
				w={{ base: '100%', md: 'auto' }}
			>
				<Divider orientation={'vertical'} color={'red'} height={'50px'} display={isMobile ? 'none' : 'block'} />

				<HStack
					spacing={2}
					minW={{ base: 'auto', md: shouldKeepActionSlots ? actionAreaMinWidth : 'auto' }}
					justifyContent='flex-end'
					flexWrap='nowrap'
					transition='none'
					flexShrink={0}
				>
					{/* Restore/Delete slot */}
					{canShowRestore ? (
						<Fragment>
							{user?.isDev && onForceDelete ? (
								<Tooltip label='Restore' hasArrow>
									<Menu>
										<MenuButton as={IconButton}
											variant={'ghost'}
											rounded={'full'}
											bg={'alpha100'}
											icon={<FaList />}
											boxSize={actionBoxSize}
											alignItems={'center'}
											justifyContent={'center'}
											_hover={{ bg: 'alpha300' }}
											aria-label={'Restore actions'}
											_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
										/>
										<MenuList>
											<MenuItem
												icon={<FaTrashRestore />}
												onClick={onCancelDeletion}
											>
												Restore Board
											</MenuItem>
											{onForceDelete && (
												<MenuItem
													color='white'
													bg={colorMode === 'dark' ? 'red.600' : 'red.500'}
													icon={<FaTrash />}
													onClick={onForceDelete}
													_hover={{ bg: colorMode === 'dark' ? 'red.700' : 'red.600' }}
												>
													Force Delete
												</MenuItem>
											)}
										</MenuList>
									</Menu>
								</Tooltip>
							) : (
								<Tooltip label='Restore' hasArrow>
									<IconButton
										onClick={onCancelDeletion}
										variant={'ghost'}
										rounded={'full'}
										bg={'alpha100'}
										boxSize={actionBoxSize}
										icon={<FaTrashRestore />}
										aria-label={'Restore'}
										alignItems={'center'}
										justifyContent={'center'}
										_hover={{ bg: 'alpha300' }}
										_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									/>
								</Tooltip>
							)}
						</Fragment>
					) : canShowDelete ? (
						<Tooltip label='Delete' hasArrow>
							<IconButton
								onClick={onDelete}
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								boxSize={actionBoxSize}
								icon={<FaTrash />}
								aria-label={'Delete'}
								alignItems={'center'}
								justifyContent={'center'}
								_hover={{ bg: 'alpha300' }}
								isDisabled={isDeleteDisabled}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Tooltip>
					) : (shouldKeepActionSlots && hasDeleteSlot) ? (
						<Box boxSize={actionBoxSize} visibility='hidden' />
					) : null}

					{/* Edit slot */}
					{canShowEdit ? (
						<Tooltip label='Edit' hasArrow>
							<IconButton
								onClick={onEdit}
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								boxSize={actionBoxSize}
								aria-label={'Edit'}
								icon={<FaPen />}
								alignItems={'center'}
								justifyContent={'center'}
								_hover={{ bg: 'alpha300' }}
								isDisabled={!!isScheduledForDeletion}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Tooltip>
					) : (shouldKeepActionSlots && hasEditSlot) ? (
						<Box boxSize={actionBoxSize} visibility='hidden' />
					) : null}

					{/* Move slot */}
					{canShowMove ? (
						<Tooltip label='Move' hasArrow>
							<IconButton
								onClick={onMove}
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								boxSize={actionBoxSize}
								aria-label={'Move'}
								icon={<FaRightLeft />}
								alignItems={'center'}
								justifyContent={'center'}
								_hover={{ bg: 'alpha300' }}
								isDisabled={!!isScheduledForDeletion}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Tooltip>
					) : (shouldKeepActionSlots && hasMoveSlot) ? (
						<Box boxSize={actionBoxSize} visibility='hidden' />
					) : null}

					{/* Analytics */}
					{canShowAnalytics ? (
						<Tooltip label='View Analytics' hasArrow>
							<span>
								<IconLinkButton
									to={analyticsUrl || '#'}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									icon={<FaChartBar />}
									boxSize={actionBoxSize}
									alignItems={'center'}
									isDisabled={!analyticsUrl}
									reloadDocument={refresh}
									justifyContent={'center'}
									_hover={{ bg: 'alpha300' }}
									aria-label={'View Analytics'}
									_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
									onClick={() => setIsLoading(true)}
									isLoading={isLoading}
								/>
							</span>
						</Tooltip>
					) : (shouldKeepActionSlots && hasAnalyticsSlot) ? (
						<Box boxSize={actionBoxSize} visibility='hidden' />
					) : null}

					{/* Permissions */}
					{canShowPerms ? (
						<Tooltip label='Manage Permissions' hasArrow>
							<span>
								<IconLinkButton
									to={permsUrl || '#'}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									icon={<FaUsers />}
									boxSize={actionBoxSize}
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
					) : (shouldKeepActionSlots && hasPermsSlot) ? (
						<Box boxSize={actionBoxSize} visibility='hidden' />
					) : null}

					{/* Flashcards */}
					{canShowFlash ? (
						editorMode ? (
							flashExists ? (
								<Tooltip label='Manage Flashcards' hasArrow>
									<span>
										<IconLinkButton
											to={flashUrl + '/manage'}
											variant='ghost'
											rounded='full'
											bg='alpha100'
											icon={<IoFlash />}
											boxSize={actionBoxSize}
											alignItems='center'
											reloadDocument={refresh}
											justifyContent='center'
											_hover={{ bg: 'alpha300' }}
											aria-label='Manage Flashcards'
											_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
											onClick={() => setIsLoading(true)}
											isLoading={isLoading}
										/>
									</span>
								</Tooltip>
							) : (
								<Tooltip label='Initialize Flashcards' hasArrow>
									<IconButton
										onClick={onFlashCreate}
										variant='ghost'
										rounded='full'
										bg='alpha100'
										boxSize={actionBoxSize}
										icon={<IoFlash />}
										alignItems='center'
										justifyContent='center'
										_hover={{ bg: 'alpha300' }}
										aria-label='Create Flashcards'
									/>
								</Tooltip>
							)
						) : (
							<Tooltip label='Flashcards' hasArrow>
								<span>
									<IconLinkButton
										to={flashUrl!}
										variant='ghost'
										rounded='full'
										bg='alpha100'
										icon={<IoFlash />}
										boxSize={actionBoxSize}
										alignItems='center'
										reloadDocument={refresh}
										justifyContent='center'
										_hover={{ bg: 'alpha300' }}
										aria-label='View Flashcards'
										_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
										onClick={() => setIsLoading(true)}
										isLoading={isLoading}
									/>
								</span>
							</Tooltip>
						)
					) : (shouldKeepActionSlots && hasFlashSlot) ? (
						<Box boxSize={actionBoxSize} visibility='hidden' />
					) : null}

					{/* Normal Resource */}
					<IconLinkButton
						to={url}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						icon={<FaLink />}
						boxSize={actionBoxSize}
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
