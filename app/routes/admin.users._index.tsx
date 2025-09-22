import { VStack, Box, Flex, Text, Avatar, HStack } from '@chakra-ui/react';
import { makeResponse, securityUtils } from '~/utils/functions.server';
import { SearchBar } from '~/components/layout/SearchBar';
import { LoaderFunctionArgs } from '@remix-run/node';
import { useDebounced } from '~/hooks/useDebounced';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { useLoaderData } from '@remix-run/react';
import { useMemo, useState } from 'react';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBUsers = await api?.admin.getUsers({ auth: token });
	if (!DBUsers || 'error' in DBUsers) throw makeResponse(DBUsers, 'Failed to get users.');

	return {
		allUsers: DBUsers.data.map((user) => ({
			...user,
			decryptedEmail: securityUtils.decrypt(user.email),
		})).sort((a, b) => {
			if (a.isDev && !b.isDev) return -1;
			if (!a.isDev && b.isDev) return 1;
			return a.displayName.localeCompare(b.displayName);
		}),
	};
};

export default function AdminUsers() {
	const { allUsers } = useLoaderData<typeof loader>();

	const [search, setSearch] = useState('');
	const dbcSearch = useDebounced(search, [search], 300);

	const finalUsers = useMemo(() => {
		if (!dbcSearch) return allUsers;
		return allUsers.filter((b) => dbcSearch ? b.displayName.includes(dbcSearch) || b.email.includes(dbcSearch) : true);
	}, [allUsers, dbcSearch]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'Manage Users'}
					description={'View all registered users.'}
					goBackPath='/admin'
				/>

				<SearchBar search={search} setSearch={setSearch} whatSearch={'users'} id='users' dividerMY={4} />

				<VStack w={'100%'} spacing={2}>
					{finalUsers.length ? finalUsers.map((user, i) => (
						<Flex
							key={i}
							rounded={'lg'}
							bg={'alpha100'}
							py={4}
							px={6}
							gap={4}
							w={'100%'}
							_hover={{ bg: 'alpha200' }}
							transition={'all 0.3s ease'}
							alignItems={'center'}
							wordBreak={'break-word'}
						>
							<Avatar size={'lg'} name={user.displayName} src={user.avatarUrl || '/logo.webp'} />

							<Flex
								justifyContent={'center'}
								alignItems={'start'}
								flexDir={'column'}
							>
								<Text fontSize={'2xl'} fontWeight={'bold'}>{user.displayName}</Text>

								<HStack spacing={2} alignItems={'start'}>
									<Text fontSize={'lg'} fontWeight={'bold'} color={'gray.500'}>({user.userId})</Text>
									<Text fontSize={'lg'} fontWeight={'bold'} color={'gray.500'}>({user.decryptedEmail})</Text>
								</HStack>
							</Flex>
						</Flex>
					)) : (
						<Flex
							rounded={'lg'}
							bg={'alpha100'}
							p={4}
							w={'100%'}
							transition={'all 0.3s ease'}
							alignItems={'center'}
							justifyContent={'center'}
						>
							<Text fontSize={'2xl'} fontWeight={'bold'}>No users.</Text>
						</Flex>
					)}
				</VStack>
			</Box>
		</VStack>
	);
}
