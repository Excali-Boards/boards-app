import { Avatar, Divider, Flex, HStack, IconButton, Text, Tooltip, useBreakpointValue } from '@chakra-ui/react';
import { useCallback, useContext, useState } from 'react';
import { MdOutlineDownloading } from 'react-icons/md';
import { BsFillGrid3X3GapFill } from 'react-icons/bs';
import { RootContext } from '~/components/Context';
import { FaDeleteLeft } from 'react-icons/fa6';
import { FaListUl } from 'react-icons/fa';
import { Link } from '@remix-run/react';

export type CustomButton<T extends 'normal' | 'link'> = (T extends 'normal' ? {
	onClick: () => void;
} : {
	to: string;
}) & {
	type: T;
	label: string;
	icon: JSX.Element;
	isDisabled?: boolean;
	tooltip: string;
	isLoading?: boolean;
	loadOnClick?: boolean;
	isActive?: boolean;
	colorScheme?: string;
};

export type MenuBarProps = {
	name: string;
	image?: string
	goBackPath?: string;
	description?: string;
	customButtons?: CustomButton<'normal' | 'link'>[];
	customButtonsBeforeSort?: boolean;
	hideSortButton?: boolean;
};

export default function MenuBar({
	name,
	image,
	goBackPath,
	description,
	customButtons,
	customButtonsBeforeSort = false,
	hideSortButton = false,
}: MenuBarProps) {
	const showDivider = useBreakpointValue({ base: false, md: true });
	const { sortType, setSortType } = useContext(RootContext) || {};
	const [areLoading, setAreLoading] = useState<number[]>([]);

	const CustomButtons = useCallback(() => {
		return customButtons?.map((button, index) => (
			<Tooltip
				key={'custom-button-' + index}
				label={button.tooltip}
				aria-label={button.tooltip}
				placement={'top'}
				hasArrow
				rounded={'lg'}
				closeOnClick={false}
			>
				{button.type === 'link' ? (
					<IconButton
						as={Link}
						to={(button as CustomButton<'link'>).to}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						aria-label={button.label}
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						isDisabled={button.isDisabled}
						isLoading={areLoading.includes(index) || button.isLoading}
						onClick={() => 'loadOnClick' in button ? setAreLoading((prev) => [...prev, index]) : undefined}
						icon={button.icon}
						isActive={button.isActive}
						colorScheme={button.colorScheme}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
					/>
				) : (
					<IconButton
						onClick={() => {
							if ('loadOnClick' in button) setAreLoading((prev) => [...prev, index]);
							(button as CustomButton<'normal'>).onClick();
						}}
						variant={'ghost'}
						rounded={'full'}
						bg={'alpha100'}
						aria-label={button.label}
						boxSize={10}
						alignItems={'center'}
						justifyContent={'center'}
						isDisabled={button.isDisabled}
						isLoading={areLoading.includes(index) || button.isLoading}
						isActive={button.isActive}
						colorScheme={button.colorScheme}
						icon={button.icon}
						_hover={{ bg: 'alpha300' }}
						_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
					/>
				)}
			</Tooltip>
		));
	}, [areLoading, customButtons]);

	return (
		<Flex
			alignItems={'center'}
			mt={{ base: 4, md: 8 }}
			justifyContent={{ base: 'center', md: 'space-between' }}
			flexDir={{ base: 'column', md: 'row' }}
			gap={{ base: 4, md: 8 }}
			borderRadius={8}
			bg={'alpha100'}
			w={'100%'}
			py={4}
			px={8}
		>
			<Flex
				alignItems={{ base: 'center', md: 'start' }}
				textAlign={{ base: 'center', md: 'start' }}
				justifyContent={'center'}
				flexDir={'column'}
			>
				<HStack alignItems={'center'} spacing={4} flexDir={{ base: 'column', md: 'row' }}>
					{image && (
						<Avatar size={'lg'} src={image} referrerPolicy='no-referrer' />
					)}
					<Flex flexDir={'column'}>
						<Text fontSize={'2xl'} fontWeight={'bold'}>{name}</Text>
						{description && <Text fontSize={'lg'}>{description}</Text>}
					</Flex>
				</HStack>
			</Flex>
			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				{showDivider && <Divider orientation={'vertical'} color={'red'} height={'50px'}/>}

				<HStack w={'100%'} spacing={2}>
					<Tooltip
						label={'Back.'}
						aria-label={'Back.'}
						placement={'top'}
						hasArrow
						rounded={'lg'}
						closeOnClick={false}
					>
						<Link to={goBackPath || '/'}>
							<IconButton
								variant={'ghost'}
								rounded={'full'}
								bg={'alpha100'}
								aria-label={'Back'}
								boxSize={10}
								alignItems={'center'}
								justifyContent={'center'}
								icon={<FaDeleteLeft />}
								_hover={{ bg: 'alpha300' }}
								_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							/>
						</Link>
					</Tooltip>

					{!!(customButtons?.length && customButtonsBeforeSort) && <CustomButtons />}

					{sortType && setSortType && !hideSortButton && <Tooltip
						label={`Switch to ${sortType === 'grid' ? 'list' : 'grid'} view.`}
						aria-label={`Switch to ${sortType === 'grid' ? 'list' : 'grid'} view.`}
						placement={'top'}
						hasArrow
						rounded={'lg'}
						closeOnClick={false}
					>
						<IconButton
							onClick={() => setSortType(sortType === 'grid' ? 'list' : 'grid')}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							aria-label={'Switch view'}
							boxSize={10}
							alignItems={'center'}
							justifyContent={'center'}
							icon={sortType === 'grid' ? <FaListUl /> : sortType === 'list' ? <BsFillGrid3X3GapFill /> : <MdOutlineDownloading />}
							_hover={{ bg: 'alpha300' }}
							_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
							isDisabled={!sortType}
						/>
					</Tooltip>}

					{!!(customButtons?.length && !customButtonsBeforeSort) && <CustomButtons />}
				</HStack>
			</Flex>
		</Flex>
	);
}
