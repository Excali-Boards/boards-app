import { Avatar, Divider, Flex, HStack, IconButton, Text, Tooltip, useBreakpointValue } from '@chakra-ui/react';
import { FaDeleteLeft } from 'react-icons/fa6';
import { useCallback, useState } from 'react';
import { Link } from '@remix-run/react';

export type CustomButton<T extends 'normal' | 'link'> = (T extends 'normal' ? {
	onClick: () => void;
} : {
	to: string;
	reloadDocument?: boolean;
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
	goBackWindow?: boolean;
	description?: string;
	customButtons?: CustomButton<'normal' | 'link'>[];
};

export default function MenuBar({
	name,
	image,
	goBackPath,
	goBackWindow,
	description,
	customButtons,
}: MenuBarProps) {
	const showDivider = useBreakpointValue({ base: false, md: true });
	const [areLoading, setAreLoading] = useState<number[]>([]);

	const CustomButtons = useCallback(() => {
		return customButtons?.map((button, index) => (
			<Tooltip
				key={'custom-button-' + index}
				label={button.tooltip}
				aria-label={button.tooltip}
				closeOnClick={false}
				placement={'top'}
				hasArrow
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
						reloadDocument={(button as CustomButton<'link'>).reloadDocument}
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
				{showDivider && <Divider orientation={'vertical'} color={'red'} height={'50px'} />}

				<HStack w={'100%'} spacing={2}>
					<Tooltip
						label={'Back'}
						aria-label={'Back'}
						placement={'top'}
						closeOnClick={false}
						hasArrow
					>
						<IconButton
							as={goBackWindow ? undefined : Link}
							onClick={goBackWindow ? () => window.history.back() : undefined}
							to={!goBackWindow ? goBackPath || '/' : undefined}
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
					</Tooltip>

					{!!customButtons?.length && <CustomButtons />}
				</HStack>
			</Flex>
		</Flex>
	);
}
