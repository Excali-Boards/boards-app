import { Flex, Text, HStack, Divider, IconButton, FlexProps } from '@chakra-ui/react';
import { FaLink, FaPen, FaSync, FaTrash } from 'react-icons/fa';
import { IconLinkButton } from '~/components/Button';
import { useContext, useState } from 'react';
import { RootContext } from '../Context';

export type CardProps = ({
	id: string;
	refresh?: boolean;
	description?: string;
	onDelete?: () => void;
	onEdit?: () => void;
	isDeleteDisabled?: boolean;
	name: string;
}) & ({
	url: string;
} | {
	onClick: () => void;
});

export function Card({
	refresh,
	description,
	isDeleteDisabled,
	onDelete,
	onEdit,
	name,
	...rest
}: CardProps & FlexProps) {
	const { sortType } = useContext(RootContext) || { sortType: 'list' };
	const [isLoading, setIsLoading] = useState(false);

	return (
		<Flex
			rounded={'lg'}
			bg={'alpha100'}
			py={4}
			px={6}
			w={'100%'}
			_hover={{ bg: 'alpha200' }}
			transition={'all 0.3s ease'}
			alignItems={'center'}
			justifyContent={'space-between'}
			wordBreak={'break-word'}
			flexDirection={sortType === 'list' ? 'row' : 'column'}
			height={'100%'}
			gap={4}
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
				{description && <Text fontSize={'lg'}>{description}</Text>}
			</Flex>
			<Flex
				alignItems={'center'}
				justifyContent={'center'}
				flexDir={'row'}
				gap={4}
			>
				{sortType === 'list' && <Divider orientation={'vertical'} color={'red'} height={'50px'} />}
				<HStack spacing={2}>
					{onDelete && (
						<IconButton
							onClick={onDelete}
							variant={'ghost'}
							rounded={'full'}
							bg={'alpha100'}
							icon={<FaTrash />}
							colorScheme='red'
							aria-label={'Obriši'}
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
							aria-label={'Uredi'}
							icon={<FaPen />}
							colorScheme='orange'
							alignItems={'center'}
							justifyContent={'center'}
							_hover={{ bg: 'alpha300' }}
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
							aria-label={'Otvori'}
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
							aria-label={'Otvori'}
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
