import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Divider, Flex, Text, VStack } from '@chakra-ui/react';
import { getIpHeaders, makeResponse, securityUtils } from '~/utils/functions.server';
import AllBoardsGroupSection from '~/components/list/AllBoardsGroupSection';
import { Container } from '~/components/layout/Container';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import { formatRelativeTime } from '~/other/utils';
import MenuBar from '~/components/layout/MenuBar';
import { NoCard } from '~/components/layout/Card';
import { useLoaderData } from '@remix-run/react';
import { useContext, useMemo } from 'react';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const [DBResources, personalResources] = await Promise.all([
		api?.groups.getAllSorted({ auth: token, headers: ipHeaders }),
		api?.boards.getPersonalBoards({ auth: token, headers: ipHeaders }),
	]);

	if (!DBResources || 'error' in DBResources) throw makeResponse(DBResources, 'Failed to get groups.');
	const personalData = personalResources && !('error' in personalResources) ? personalResources.data : null;
	const personal = (personalData && 'owners' in personalData ? personalData.owners : personalData ? [personalData] : []).map((owner) => ({
		...owner,
		owner: { ...owner.owner, email: securityUtils.decrypt(owner.owner.email) },
	}));

	return {
		personal: personal.map((owner) => ({
			...owner,
			boards: owner.boards.map((board) => ({
				...board,
				scheduledForDeletionText: board.scheduledForDeletion ? formatRelativeTime(new Date(board.scheduledForDeletion), true) : null,
			})),
			categories: owner.categories.map((category) => ({
				...category,
				boards: category.boards.map((board) => ({
					...board,
					scheduledForDeletionText: board.scheduledForDeletion ? formatRelativeTime(new Date(board.scheduledForDeletion), true) : null,
				})),
			})),
		})),
		groups: DBResources.data.map((group) => ({
			...group,
			categories: group.categories.map((category) => ({
				...category,
				boards: category.boards.map((board) => ({
					...board,
					scheduledForDeletionText: board.scheduledForDeletion ? formatRelativeTime(new Date(board.scheduledForDeletion), true) : null,
				})),
			})),
		})),
	};
};

export default function All() {
	const { groups: list, personal } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};
	const indexOfDefaultGroup = useMemo(() => {
		const defaultGroup = list.findIndex((group) => group.id === user?.mainGroupId);
		return defaultGroup !== -1 ? defaultGroup : undefined;
	}, [list, user]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar name='All Boards' description='List of all boards sorted by groups and categories.' />
				<Divider my={4} />

				{personal.length > 0 && (
					<Container flexDir='column' bg='transparent' p={0} mb={4}>
						<Accordion allowMultiple>
							<Flex flex={1} bg='alpha100' p={2} rounded='lg' gap={2} flexDir='column'>
								<AccordionItem border='none'>
									<AccordionButton rounded='lg'>
										<Text flex='1' textAlign='left' fontWeight='bold' fontSize='lg'>Personal Boards</Text>
										<AccordionIcon />
									</AccordionButton>
									<AccordionPanel pb={4} display='flex' flexDir='column' flexWrap='wrap' gap={2}>
										{personal.map((owner) => (
											<Flex key={owner.id} flex={1} bg='alpha100' p={2} rounded='lg' gap={2} flexDir='column'>
												<AllBoardsGroupSection group={owner} owner={owner} />
											</Flex>
										))}
									</AccordionPanel>
								</AccordionItem>
							</Flex>
						</Accordion>
					</Container>
				)}

				<Container flexDir='column' bg='transparent' p={0}>
					<Accordion allowMultiple defaultIndex={typeof indexOfDefaultGroup === 'number' ? [indexOfDefaultGroup] : undefined}>
						{list.length ? (
							<Flex flex={1} bg='alpha100' p={2} rounded='lg' gap={2} flexDir='column'>
								{list.map((group) => <AllBoardsGroupSection key={group.id} group={group} />)}
							</Flex>
						) : (
							<NoCard noWhat='groups, categories, or boards' />
						)}
					</Accordion>
				</Container>
			</Box>
		</VStack>
	);
}
