import { Flex, Text, HStack, Divider, IconButton, FlexProps, useColorMode, Badge, useBreakpointValue, Tooltip, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { FaLink, FaList, FaPen, FaTrash, FaTrashRestore, FaUsers, FaChartBar } from 'react-icons/fa';
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
	onEdit?: () => void;
};

export function Card({
	url,
	name,
	refresh,
	permsUrl,
	analyticsUrl,
	flashUrl,
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
	onEdit,
}: CardProps & FlexProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { colorMode } = useColorMode();

	const { user } = useContext(RootContext) || {};

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
			>
				<Divider orientation={'vertical'} color={'red'} height={'50px'} display={isMobile && editorMode ? 'none' : 'block'} />

				<HStack spacing={2}>
					{/* Edit/Delete/Restore */}
					{onCancelDeletion && isScheduledForDeletion && (
						<Fragment>
							{user?.isDev && onForceDelete ? (
								<Tooltip label='Restore' hasArrow>
									<Menu>
										<MenuButton as={IconButton}
											variant={'ghost'}
											rounded={'full'}
											bg={'alpha100'}
											icon={<FaList />}
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

					{/* Analytics */}
					{analyticsUrl && (
						<Tooltip label='View Analytics' hasArrow>
							<span>
								<IconLinkButton
									to={analyticsUrl || '#'}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									icon={<FaChartBar />}
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
					)}

					{/* Permissions */}
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

					{/* Flashcards */}
					{((flashExists && flashUrl) || (editorMode && onFlashCreate)) && (
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
					)}

					{/* Normal Resource */}
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
