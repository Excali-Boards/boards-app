import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, Avatar, Text, Button, Image, Flex, HStack, IconButton, useColorMode, Heading, Box, useBreakpointValue, Divider, Tooltip, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, useDisclosure, FlexProps, VStack, Center } from '@chakra-ui/react';
import { FaArrowUp, FaCode, FaCogs, FaList, FaMoon, FaSun, FaUser, FaUsers, FaUserSlash } from 'react-icons/fa';
import { AccessLevel, CollabUser, GetUsersOutput } from '@excali-boards/boards-api-client';
import { Fragment, useCallback, useContext, useMemo, useState } from 'react';
import { Link, useFetcher, useLocation } from '@remix-run/react';
import { IconLinkButton, LinkButton } from '~/components/Button';
import { RootContext } from '~/components/Context';
import { IoIosColorPalette } from 'react-icons/io';
import { canEdit, canManage } from '~/other/utils';
import { IoFlash, IoMenu } from 'react-icons/io5';
import { FiLogIn, FiUsers } from 'react-icons/fi';
import { WebReturnType } from '~/other/types';
import { useScroll } from '~/hooks/useScroll';
import { MdPrivacyTip } from 'react-icons/md';

export type LayoutProps = {
	user: GetUsersOutput | null;
	children: React.ReactNode;
	sideBarHeader?: 'header' | 'sidebar' | 'none';
};

export default function Layout({
	user, children,
	sideBarHeader = 'header',
}: LayoutProps) {
	return (
		<Flex
			flexDir={sideBarHeader === 'header' ? 'column' : 'row'}
			minH={'100vh'}
			w='100%'
		>
			{sideBarHeader === 'header' ? (<Header user={user} />) : sideBarHeader === 'sidebar' ? (<Sidebar user={user} />) : <></>}

			<Box flex={1} w='100%'>
				{children}
			</Box>

			{sideBarHeader === 'header' && <Footer mt={24} />}
		</Flex>
	);
}

export type HeaderProps = {
	user: GetUsersOutput | null;
	forceGoBack?: boolean;
};

export function Header({ user, forceGoBack }: HeaderProps) {
	const showDrawer = useBreakpointValue({ base: true, lg: false });
	const { toggleColorMode, colorMode } = useColorMode();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const { isScrolled } = useScroll();

	return (
		<Flex
			w='100%'
			alignItems={'center'}
			flexDir={'column'}
			top={'0px'}
			zIndex={99}
			pos={'relative'}
			bg={'transparent'}
			backdropFilter={isScrolled ? 'blur(10px)' : 'none'}
			transition={'all 0.2s ease-in-out'}
			borderBottom={'1px solid'}
			borderColor={'alpha100'}
		>
			<Flex
				h={16}
				alignItems={'center'}
				justifyContent={'space-between'}
				w={'100%'}
				mx='auto'
				px={{
					base: 4,
					md: 8,
				}}
			>
				<HStack
					as={LinkButton}
					to='/'
					reloadDocument={forceGoBack}
					alignItems={'center'}
					justifyContent={'center'}
					display={'flex'}
					pl={1} pr={3} py={6}
					bg={'transparent'}
					gap={1}
					rounded={'lg'}
					_hover={{ bg: 'alpha100', animation: 'all 0.2s ease-in-out' }}
					_active={{ bg: 'alpha200', animation: 'all 0.2s ease-in-out' }}
				>
					<Image
						src={'/logo-tr.webp'}
						alt={'logo'}
						loading='lazy'
						width={10}
						rounded={'md'}
						transition={'all 0.2s ease-in-out'}
						_hover={{ transform: 'rotate(180deg) rotateY(180deg)' }}
					/>

					<Heading size='md' fontWeight={600}>
						Boards
					</Heading>
				</HStack>

				<HStack spacing={2}>
					<NavbarButtons display={showDrawer ? 'none' : 'flex'} isDev={!!user?.isDev} addProfile={!!user?.email} forceGoBack={forceGoBack} onClose={onClose} />

					<HStack spacing={2}>
						<IconButton
							onClick={toggleColorMode}
							variant={'ghost'}
							rounded={'full'}
							aria-label='Change theme'
							boxSize={10}
							alignItems={'center'}
							justifyContent={'center'}
							display={'flex'}
							icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
							_hover={{ bg: 'alpha300' }}
							bg={'alpha100'}
						/>

						{user?.email ? (
							<Fragment>
								<Divider orientation='vertical' h={6} ml={1} />
								{showDrawer ? (
									<Flex
										alignItems={'center'}
										justifyContent={'center'}
										display={'flex'}
										onClick={onOpen}
										rounded={'full'}
										bg={'transparent'}
										cursor={'pointer'}
										pl={1} pr={3} h={10}
										_hover={{ bg: 'alpha300' }}
									>
										<Avatar size={'sm'} src={user.avatarUrl || undefined} referrerPolicy='no-referrer' />
										<Text fontWeight={600} fontSize={'lg'} ml={2}>{user.displayName}</Text>
									</Flex>
								) : (
									<Flex
										alignItems={'center'}
										justifyContent={'center'}
										display={'flex'}
										as={LinkButton}
										to={'/profile'}
										rounded={'full'}
										bg={'transparent'}
										pl={1} pr={3} h={10}
										_hover={{ bg: 'alpha100' }}
									>
										<Avatar size={'sm'} src={user.avatarUrl || undefined} referrerPolicy='no-referrer' />
										<Text fontWeight={600} fontSize={'lg'} ml={2}>{user.displayName}</Text>
									</Flex>
								)}
							</Fragment>
						) : (
							<Fragment>
								<IconButton
									aria-label='Menu'
									icon={<IoMenu />}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									boxSize={10}
									alignItems={'center'}
									justifyContent={'center'}
									display={{ base: 'flex', md: 'flex', lg: 'none' }}
									onClick={onOpen}
									_hover={{ bg: 'alpha300' }}
								/>

								<IconLinkButton
									to={'/login'}
									aria-label='Login'
									icon={<FiLogIn />}
									variant={'ghost'}
									rounded={'full'}
									bg={'alpha100'}
									boxSize={10}
									alignItems={'center'}
									justifyContent={'center'}
									display={'flex'}
									_hover={{ bg: 'alpha300' }}
								/>
							</Fragment>
						)}
					</HStack>
				</HStack>
			</Flex>

			<Drawer isOpen={isOpen} onClose={onClose}>
				<DrawerOverlay />
				<DrawerContent bg={colorMode === 'light' ? 'white' : 'brand900'}>
					<DrawerCloseButton />
					<DrawerHeader>Menu</DrawerHeader>
					<DrawerBody>
						<NavbarButtons flexDir={'column'} isDev={!!user?.isDev} isDrawer addProfile={!!user?.email} onClose={onClose} forceGoBack={forceGoBack} />
					</DrawerBody>
				</DrawerContent>
			</Drawer>
		</Flex>
	);
}

export type BoardInfo = {
	accessLevel: AccessLevel;
	hasFlashCards: boolean;
	hideCollaborators: boolean;
};

export type SidebarProps = {
	user: GetUsersOutput | null;
};

export function Sidebar({ user }: SidebarProps) {
	const { setUseOppositeColorForBoard, useOppositeColorForBoard, boardActiveCollaborators = [], boardInfo, setBoardInfo } = useContext(RootContext) || {};
	const [kickModalOpen, setKickModalOpen] = useState(false);
	const { toggleColorMode, colorMode } = useColorMode();

	const fetcher = useFetcher<WebReturnType<string>>();
	const location = useLocation();

	const baseFlashPath = useMemo(() => location.pathname.replace('/groups/', '/flashcards/'), [location.pathname]);
	const canEditFlash = useMemo(() => boardInfo ? canEdit(boardInfo.accessLevel) : false, [boardInfo]);

	const flashTo = useMemo(() => {
		if (boardInfo?.hasFlashCards) return baseFlashPath;
		else if (canEditFlash) return baseFlashPath.endsWith('/') ? `${baseFlashPath}init` : `${baseFlashPath}/init`;
		else return '#';
	}, [boardInfo, canEditFlash, baseFlashPath]);

	const flashTooltip = useMemo(() => {
		if (boardInfo?.hasFlashCards) return 'Flashcards';
		else if (canEditFlash) return 'Initialize Flashcards';
		else return 'Flashcards (not available)';
	}, [boardInfo, canEditFlash]);

	const flashDisabled = useMemo(() => {
		if (boardInfo?.hasFlashCards) return false;
		else if (canEditFlash) return false;
		else return true;
	}, [boardInfo, canEditFlash]);

	return (
		<Flex
			w={16}
			h={'100vh'}
			flexDir={'column'}
			alignItems={'center'}
			justifyContent={'space-between'}
			bg={'transparent'}
			borderRight={'1px solid'}
			borderColor={'alpha100'}
			transition={'all 0.2s ease-in-out'}
		>
			<Flex
				w={'100%'}
				h={16}
				alignItems={'center'}
				justifyContent={'center'}
				bg={'transparent'}
			>
				<HStack
					to={'/'}
					reloadDocument
					as={LinkButton}
					display={'flex'}
					rounded={'full'}
					aria-label='Home'
					bg={'transparent'}
					alignItems={'center'}
					justifyContent={'center'}
					_hover={{ bg: 'transparent' }}
					_active={{ bg: 'transparent' }}
					padding={0}
				>
					<Image
						src={'/logo-tr.webp'}
						alt={'logo'}
						boxSize={10}
						loading='lazy'
						rounded={'md'}
						transition={'all 0.2s ease-in-out'}
						_hover={{ transform: 'rotate(180deg) rotateY(180deg)' }}
					/>
				</HStack>
			</Flex>

			<Flex
				flex={1}
				w={'100%'}
				alignItems={'center'}
				justifyContent={'flex-end'}
				flexDir={'column'}
				bg={'transparent'}
				gap={2}
				mb={2}
			>
				{boardInfo && canManage(boardInfo.accessLevel) && (
					<Tooltip
						label='Kick collaborators'
						aria-label='Kick collaborators'
						placement='right'
						hasArrow
					>
						<IconButton
							onClick={() => setKickModalOpen(true)}
							variant={'ghost'}
							rounded={'full'}
							aria-label='Kick collaborators'
							boxSize={10}
							alignItems={'center'}
							justifyContent={'center'}
							display={'flex'}
							bg={'transparent'}
							icon={<FaUserSlash />}
							_hover={{ bg: 'alpha300' }}
						/>
					</Tooltip>
				)}

				<Tooltip
					label='Hide collaborators'
					aria-label='Hide collaborators'
					placement='right'
					hasArrow
				>
					<IconButton
						onClick={() => setBoardInfo?.((prev) => prev ? { ...prev, hideCollaborators: !prev.hideCollaborators } : null)}
						variant={'ghost'}
						rounded={'full'}
						aria-label='Hide collaborators'
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						bg={'transparent'}
						icon={<MdPrivacyTip />}
						_hover={{ bg: 'alpha300' }}
					/>
				</Tooltip>

				<Tooltip
					label={flashTooltip}
					aria-label='Flashcards'
					placement='right'
					hasArrow
				>
					<span>
						<IconLinkButton
							variant={'ghost'}
							rounded={'full'}
							aria-label='Flashcards'
							boxSize={10}
							target='_blank'
							alignItems={'center'}
							justifyContent={'center'}
							display={'flex'}
							bg={'transparent'}
							icon={<IoFlash />}
							_hover={{ bg: 'alpha300' }}
							isDisabled={flashDisabled || !boardInfo}
							to={flashTo}
						/>
					</span>
				</Tooltip>

				<Tooltip
					label='Use opposite color for board'
					aria-label='Use opposite color for board'
					placement='right'
					hasArrow
				>
					<IconButton
						onClick={() => setUseOppositeColorForBoard?.(!useOppositeColorForBoard)}
						variant={'ghost'}
						rounded={'full'}
						aria-label='Use opposite color for board'
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						bg={'transparent'}
						icon={<IoIosColorPalette />}
						_hover={{ bg: 'alpha300' }}
					/>
				</Tooltip>

				<Tooltip
					label='Change color mode'
					aria-label='Change color mode'
					placement='right'
					hasArrow
				>
					<IconButton
						onClick={() => toggleColorMode()}
						variant={'ghost'}
						rounded={'full'}
						aria-label='Change color mode'
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						bg={'transparent'}
						icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
						_hover={{ bg: 'alpha300' }}
					/>
				</Tooltip>

				{user?.email ? (
					<LinkButton
						id={'user-avatar'}
						rounded={'full'}
						aria-label='Profile'
						boxSize={10}
						to={'/profile'}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						bg={'transparent'}
						_hover={{ bg: 'alpha300' }}
					>
						<Avatar
							size={'sm'}
							src={user.avatarUrl || undefined}
							referrerPolicy='no-referrer'
						/>
					</LinkButton>
				) : (
					<IconLinkButton
						to={'/login'}
						variant={'ghost'}
						rounded={'full'}
						aria-label='Login'
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						icon={<FiLogIn />}
						_hover={{ bg: 'alpha300' }}
					/>
				)}
			</Flex>

			<KickUsersModal
				isOpen={kickModalOpen}
				currentUserId={user?.userId || ''}
				users={boardActiveCollaborators || []}
				onClose={() => setKickModalOpen(false)}
				onKick={(userId) => fetcher.submit({ type: 'kickUser', userId }, { method: 'post', action: location.pathname })}
			/>
		</Flex>
	);
}

export type FooterProps = {
	mt?: number;
	forceGoBack?: boolean;
};

export function Footer({ mt = 24, forceGoBack }: FooterProps) {
	const place = (useBreakpointValue({ base: 'top', md: 'left' }) || 'top') as 'top' | 'left';

	const footerIcon = useCallback((icon: JSX.Element, href: string, text: string) => (
		<Tooltip label={text} aria-label={text} placement={place} hasArrow>
			<IconButton
				as={Link}
				to={href}
				variant={'ghost'}
				rounded={'full'}
				reloadDocument={forceGoBack}
				_hover={{ bg: 'rgba(0, 0, 0, 0.1)' }}
				_active={{ bg: 'rgba(0, 0, 0, 0.2)' }}
				aria-label='Footer Icon'
				target='_blank'
				icon={icon}
			/>
		</Tooltip>
	), [forceGoBack, place]);

	return (
		<Flex
			h={12}
			w='100%'
			bg={'transparent'}
			borderTop='1px solid'
			borderColor='alpha100'
			justifyContent='center'
			alignItems='center'
			position='relative'
			padding={4}
			mt={mt}
		>
			<Text fontSize={'sm'} fontWeight={600} position='absolute' left={{ base: 4, md: '50%' }} transform={{ md: 'translateX(-50%)' }}>
				&copy; {new Date().getFullYear()} Boards. All rights reserved.
			</Text>

			<Flex position='absolute' right={4}>
				{place === 'left' && footerIcon(<FaCode />, 'https://github.com/Excali-Boards', 'GitHub')}

				{<Tooltip label='Back to top' placement={place} hasArrow>
					<IconButton
						variant={'ghost'}
						rounded={'full'}
						aria-label='Back to top'
						_hover={{ bg: 'rgba(0, 0, 0, 0.1)' }}
						_active={{ bg: 'rgba(0, 0, 0, 0.2)' }}
						icon={<FaArrowUp />}
						onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
					/>
				</Tooltip>}
			</Flex>
		</Flex>
	);
}

export type NavButton = ({
	id: 1; icon: JSX.Element; to: string; target?: string;
	dividerBelow?: boolean;
} | {
	id: 2; name: string; icon: JSX.Element; to: string; target?: string;
	dividerBelow?: boolean;
}) & {
	show?: boolean;
};

export type NavbarButtonsProps = {
	isDev?: boolean;
	isDrawer?: boolean;
	forceGoBack?: boolean;
	addProfile?: boolean;
	onClose?: () => void;
} & FlexProps;

export function NavbarButtons({
	isDev,
	isDrawer,
	forceGoBack,
	addProfile,
	onClose,
	...props
}: NavbarButtonsProps) {
	const { canInvite, showAllBoards } = useContext(RootContext) || {};

	const allItems = useMemo((): NavButton[] => {
		const buttons: NavButton[] = [];

		if (isDev) buttons.push({ id: 2, name: 'Admin', icon: <FaCogs />, to: '/admin', dividerBelow: isDrawer });
		if (canInvite) buttons.push({ id: 2, name: 'Invites', icon: <FaUsers />, to: '/invites' });
		if (addProfile && showAllBoards) buttons.push({ id: 2, name: 'All Boards', icon: <FaList />, to: '/all' });
		if (isDrawer && addProfile) buttons.unshift({ id: 2, name: 'Profile', icon: <FaUser />, to: '/profile' });

		return buttons;
	}, [addProfile, isDev, isDrawer, canInvite, showAllBoards]);

	return (
		<Flex gap={2} {...props}>
			{allItems.map((item, index) => {
				if (item.show === false) return null;
				else if (item.id === 1) {
					return (
						<Fragment key={`nav-button-${index}`}>
							<IconButton
								as={Link}
								key={index}
								to={item.to}
								aria-label={`Go to ${item.to}`}
								reloadDocument={forceGoBack}
								rounded={'full'}
								bg={'alpha100'}
								_hover={{ bg: 'alpha300' }}
								icon={item.icon}
								target={item.target}
								onClick={onClose}
							/>

							{item.dividerBelow && <Divider w={'100%'} my={1} key={`divider-${index}`} />}
						</Fragment>
					);
				} else {
					return (
						<Fragment key={`nav-button-${index}`}>
							<LinkButton
								key={index}
								to={item.to}
								reloadDocument={forceGoBack}
								rounded={'full'}
								bg={'alpha100'}
								_hover={{ bg: 'alpha300' }}
								rightIcon={item.icon}
								target={item.target}
								onClick={onClose}
							>
								{item.name}
							</LinkButton>

							{item.dividerBelow && <Divider w={'100%'} my={1} key={`divider-${index}`} />}
						</Fragment>
					);
				}
			})}
		</Flex>
	);
}

export type KickUsersModalProps = {
	users: CollabUser[];
	currentUserId: string;
	isOpen: boolean;
	onClose: () => void;
	onKick: (userId: string) => void;
};

export function KickUsersModal({ users, isOpen, currentUserId, onClose, onKick }: KickUsersModalProps) {
	const { colorMode } = useColorMode();

	return (
		<Modal isOpen={isOpen} onClose={onClose} isCentered>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Kick Users</ModalHeader>
				<ModalBody>
					{users.length ? (
						<VStack spacing={3} align='stretch'>
							{users.map((user) => (
								<Flex
									key={user.id}
									align='center'
									justify='space-between'
									p={3}
									bg={'alpha100'}
									rounded='lg'
									_hover={{ bg: 'alpha200' }}
									transition='background 0.2s'
								>
									<Flex align='center' gap={3}>
										<Avatar
											size='sm'
											src={user.avatarUrl || undefined}
											name={user.username}
											referrerPolicy='no-referrer'
										/>
										<Text fontWeight='medium' fontSize={'xl'}>{user.username}</Text>
									</Flex>

									<IconButton
										size='sm'
										colorScheme='orange'
										icon={<FaUserSlash />}
										aria-label={`Kick ${user.username}`}
										isDisabled={user.id === currentUserId}
										onClick={() => onKick(user.id)}
										_disabled={{
											opacity: 0.5,
											cursor: 'not-allowed',
											_hover: { bg: 'transparent' },
										}}
									/>
								</Flex>
							))}
						</VStack>
					) : (
						<Center py={6}>
							<VStack spacing={3} color={'alpha500'}>
								<FiUsers size={24} />
								<Text>No collaborators available.</Text>
							</VStack>
						</Center>
					)}
				</ModalBody>
				<ModalFooter display={'flex'} gap={1}>
					<Button
						flex={1}
						colorScheme='gray'
						onClick={onClose}
					>
						Close
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
