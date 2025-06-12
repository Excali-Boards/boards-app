import ListOrGrid from '~/components/layout/ListOrGrid';
import { VStack, Box, Divider } from '@chakra-ui/react';
import MenuBar from '~/components/layout/MenuBar';
import { useMemo } from 'react';

export type AdminCardType = ({ url: string; } | { onClick: () => void; }) & {
	name: string;
	id: string;
};

export default function Admin() {
	const cards = useMemo<AdminCardType[]>(() => [
		{ name: 'Users', url: '/admin/users', id: 'users' },
		{ name: 'Rooms', url: '/admin/rooms', id: 'rooms' },
	], []);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Admin Panel'}
					description={'Admin panel for managing the website.'}
					goBackPath='/'
				/>

				<Divider my={4} />

				<ListOrGrid
					noWhat='cards'
					cards={cards}
				/>
			</Box>
		</VStack>
	);
}
