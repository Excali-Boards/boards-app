import { VStack, Box, Divider } from '@chakra-ui/react';
import CardList from '~/components/layout/CardList';
import MenuBar from '~/components/layout/MenuBar';

export default function Admin() {
	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Admin Panel'}
					description={'Admin panel for managing the website.'}
					goBackPath='/'
				/>

				<Divider my={4} />

				<CardList
					noWhat='cards'
					cards={[
						{ name: 'Users', url: '/admin/users', id: 'users' },
						{ name: 'Rooms', url: '/admin/rooms', id: 'rooms' },
					]}
				/>
			</Box>
		</VStack>
	);
}
