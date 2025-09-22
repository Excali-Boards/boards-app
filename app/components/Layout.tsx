import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Avatar, Text, Button, Image, Flex, HStack, IconButton, useColorMode, Heading, Box, useBreakpointValue, Divider, Tooltip, Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, useDisclosure, FlexProps, VStack, Center, useToast } from '@chakra-ui/react';
import { FaArrowUp, FaCode, FaCogs, FaList, FaMoon, FaSun, FaUser, FaUsers, FaUserSlash } from 'react-icons/fa';
import { Fragment, useCallback, useContext, useMemo, useState } from 'react';
import { GetUsersOutput } from '@excali-boards/boards-api-client';
import { Link, useFetcher, useLocation } from '@remix-run/react';
import useFetcherResponse from '~/hooks/useFetcherResponse';
import { ColabUser, WebReturnType } from '~/other/types';
import { platformButtons } from '~/other/platforms';
import { RootContext } from '~/components/Context';
import { IoIosColorPalette } from 'react-icons/io';
import { FiLogIn, FiUsers } from 'react-icons/fi';
import { LinkButton } from '~/components/Button';
import { useScroll } from '~/hooks/useScroll';
import { MdPrivacyTip } from 'react-icons/md';
import { IoMenu } from 'react-icons/io5';

export type LayoutProps = {
	user: GetUsersOutput | null;
	children: React.ReactNode;
	sideBarHeader?: 'header' | 'sidebar' | 'none';
};

export default function Layout({
	user, children,
	sideBarHeader = 'header',
}: LayoutProps) {
	const [modalOpen, setModalOpen] = useState<'login' | null>(null);
	const location = useLocation();

	return (
		<Flex
			flexDir={sideBarHeader === 'header' ? 'column' : 'row'}
			minH={'100vh'}
			w='100%'
		>
			{sideBarHeader === 'header' ? (
				<Header user={user} setModalOpen={setModalOpen} />
			) : sideBarHeader === 'sidebar' ? (
				<Sidebar user={user} setModalOpen={setModalOpen} />
			) : <></>}

			<Box flex={1} w='100%'>
				{children}
			</Box>

			{sideBarHeader === 'header' && <Footer mt={24} />}

			<LoginModal
				isOpen={modalOpen === 'login'}
				onClose={() => setModalOpen(null)}
				backTo={location.pathname}
			/>
		</Flex>
	);
}

export type HeaderProps = {
	user: GetUsersOutput | null;
	forceGoBack?: boolean;
	setModalOpen: (value: 'login' | null) => void;
};

export function Header({
	user,
	forceGoBack,
	setModalOpen,
}: HeaderProps) {
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

								<IconButton
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
									onClick={() => setModalOpen('login')}
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

export type SidebarProps = {
	user: GetUsersOutput | null;
	setModalOpen: (value: 'login' | null) => void;
};

export function Sidebar({
	user,
	setModalOpen,
}: SidebarProps) {
	const { setUseOppositeColorForBoard, useOppositeColorForBoard, setHideCollaborators, hideCollaborators, boardActiveCollaborators = [] } = useContext(RootContext) || {};
	const [kickModalOpen, setKickModalOpen] = useState(false);
	const { toggleColorMode, colorMode } = useColorMode();

	const fetcher = useFetcher<WebReturnType<string>>();
	const location = useLocation();
	const toast = useToast();

	useFetcherResponse(fetcher, toast, () => setModalOpen(null));

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
				w={'100%'}
				h={60}
				alignItems={'center'}
				justifyContent={'center'}
				bg={'transparent'}
				flexDir={'column'}
				gap={2}
				mb={2}
			>
				{user?.isDev && boardActiveCollaborators.length && (
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
						onClick={() => setHideCollaborators?.(!hideCollaborators)}
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
					<IconButton
						variant={'ghost'}
						rounded={'full'}
						aria-label='Login'
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						display={'flex'}
						icon={<FiLogIn />}
						_hover={{ bg: 'alpha300' }}
						onClick={() => setModalOpen('login')}
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

				{<Tooltip label='Back to top.' aria-label='Back to top' placement={place} hasArrow>
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
		if (isDrawer && addProfile) buttons.unshift({ id: 2, name: 'Profile', icon: <FaUser />, to: '/profile', dividerBelow: isDrawer });

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

export type LoginModalProps = {
	isOpen: boolean;
	onClose: () => void;
	backTo?: string;
};

export function LoginModal({ isOpen, onClose, backTo }: LoginModalProps) {
	const { allowedPlatforms = [] } = useContext(RootContext) || {};
	const allButtons = useMemo(() => platformButtons(allowedPlatforms), [allowedPlatforms]);

	const { colorMode } = useColorMode();

	return (
		<Modal
			isOpen={isOpen}
			onClose={() => onClose()}
			isCentered
		>
			<ModalOverlay />
			<ModalContent bg={colorMode === 'light' ? 'white' : 'brand900'} mx={2}>
				<ModalHeader>Login</ModalHeader>
				<ModalBody>
					<ModalCloseButton />
					{allButtons.length ? allButtons.map((platform) => (
						<LinkButton
							to={'/login?type=' + platform.name.toLowerCase() + (backTo ? `&backTo=${backTo}` : '')}
							id={`login-button-${platform.name}`}
							rounded={12}
							key={platform.name}
							bgColor={platform.color}
							leftIcon={platform.icon({ boxSize: 6 })}
							justifyContent='flex-start'
							variant='solid'
							pl={'25%'}
							size='lg'
							w='100%'
						>
							Continue with {platform.name}
						</LinkButton>
					)) : (
						<Box>
							No platforms enabled.
						</Box>
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

export type KickUsersModalProps = {
	users: ColabUser[];
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
									key={user.userId}
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
										aria-label={`Kick ${user.username}`}
										icon={<FaUserSlash />}
										colorScheme='red'
										variant='outline'
										size='sm'
										isDisabled={user.userId === currentUserId}
										onClick={() => onKick(user.userId)}
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
