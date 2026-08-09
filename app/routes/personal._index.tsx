import { Accordion, Box, Divider, Flex, VStack } from '@chakra-ui/react';
import { getIpHeaders, makeResponse, securityUtils } from '~/utils/functions.server';
import AllBoardsGroupSection from '~/components/list/AllBoardsGroupSection';
import { Container } from '~/components/layout/Container';
import { LoaderFunctionArgs, redirect } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { formatRelativeTime } from '~/other/utils';
import MenuBar from '~/components/layout/MenuBar';
import { NoCard } from '~/components/layout/Card';
import { useLoaderData } from '@remix-run/react';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const headers = getIpHeaders(request);
	if (!headers) throw makeResponse(null, 'Failed to get client IP.');

	const currentUser = await api?.users.getUser({ auth: token, headers });
	if (!currentUser || 'error' in currentUser) throw makeResponse(currentUser, 'Failed to get current user.');
	if (!currentUser.data.isDev) return redirect(`/personal/${currentUser.data.userId}`);

	const result = await api?.personal.getAllPersonalBoards({ auth: token, headers });
	if (!result || 'error' in result) throw makeResponse(result, 'Failed to get personal workspaces.');

	return {
		personal: result.data.map((workspace) => ({
			id: workspace.id,
			owner: {
				...workspace.owner,
				email: securityUtils.decrypt(workspace.owner.email),
			},
			categories: workspace.categories.map((category) => ({
				...category,
				boards: category.boards.map((board) => ({
					...board,
					scheduledForDeletionText: board.scheduledForDeletion ? formatRelativeTime(new Date(board.scheduledForDeletion), true) : null,
				})),
			})),
		})),
	};
};

export default function PersonalBoards() {
	const { personal } = useLoaderData<typeof loader>();

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }}>
				<MenuBar name='Personal Boards' description='List of all personal boards sorted by users and categories.' />
				<Divider my={4} />

				<Container flexDir='column' bg='transparent' p={0}>
					<Accordion allowMultiple>
						{personal.length ? (
							<Flex flex={1} bg='alpha100' p={2} rounded='lg' gap={2} flexDir='column'>
								{personal.map((owner) => (
									<AllBoardsGroupSection key={owner.id} group={owner} owner={owner} />
								))}
							</Flex>
						) : (
							<NoCard noWhat='personal boards, categories, or boards' />
						)}
					</Accordion>
				</Container>
			</Box>
		</VStack>
	);
}
