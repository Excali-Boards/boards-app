import { Flex, VStack, Accordion, AccordionItem, AccordionButton, AccordionPanel, Box, Text, Divider, AccordionIcon, Badge, useColorMode } from '@chakra-ui/react';
import { formatBytes, getCardDeletionTime } from '~/other/utils';
import { Container } from '~/components/layout/Container';
import { MdOutlineManageHistory } from 'react-icons/md';
import { makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import { IconLinkButton } from '~/components/Button';
import { authenticator } from '~/utils/auth.server';
import { RootContext } from '~/components/Context';
import MenuBar from '~/components/layout/MenuBar';
import { useLoaderData } from '@remix-run/react';
import { useContext, useMemo } from 'react';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const allGroups = await api?.groups.getAllSorted({ auth: token });
	if (!allGroups || 'error' in allGroups) throw makeResponse(allGroups, 'Failed to get groups.');

	return allGroups.data;
};

export default function All() {
	const { isAdmin, list } = useLoaderData<typeof loader>();
	const { user } = useContext(RootContext) || {};
	const { colorMode } = useColorMode();

	const indexOfDefaultGroup = useMemo(() => {
		const defaultGroup = list.findIndex((group) => group.id === user?.mainGroupId);
		return defaultGroup !== -1 ? defaultGroup : undefined;
	}, [list, user]);

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }} id='a1'>
			<Box maxWidth='1000px' width={{ base: '100%', sm: '90%', md: '80%', xl: '60%' }} id='a2'>
				<MenuBar
					name={'All Boards'}
					description={'List of all boards sorted by groups and categories.'}
					hideSortButton
					customButtons={isAdmin ? [{
						type: 'link',
						to: '/',
						label: 'Manage groups and categories.',
						icon: <MdOutlineManageHistory size={20} />,
						tooltip: 'Manage groups and categories.',
					}] : []}
				/>

				<Divider my={4} />

				<Container
					flexDir={'column'}
					bg={'transparent'}
					p={0}
				>
					<Accordion allowMultiple defaultIndex={typeof indexOfDefaultGroup === 'number' ? [indexOfDefaultGroup] : undefined}>
						{list.length ? (
							<Flex flex={1} bg={'alpha100'} p={2} rounded={'lg'} gap={2} flexDir='column'>
								{list.map((group, groupIndex) => (
									<AccordionItem key={groupIndex} border='none'>
										<AccordionButton rounded={'lg'}>
											<Text flex='1' textAlign='left' fontWeight='bold' fontSize='lg'>
												{group.name}
											</Text>
											<AccordionIcon />
										</AccordionButton>
										<AccordionPanel
											pb={4}
											display='flex'
											flexDir='column'
											flexWrap='wrap'
											gap={2}
										>
											{group.categories.map((category, categoryIndex) => (
												<Flex flex={1} bg={'alpha100'} p={2} rounded={'lg'} gap={2} flexDir='column' key={categoryIndex}>
													<AccordionItem key={categoryIndex} border='none'>
														<AccordionButton rounded={'lg'}>
															<Text flex='1' textAlign='left' fontWeight='bold' fontSize='lg'>
																{category.name}
															</Text>
															<AccordionIcon />
														</AccordionButton>
														<AccordionPanel
															pb={4}
															display='flex'
															flexDir='column'
															flexWrap='wrap'
															gap={2}
														>
															{category.boards.map((board, boardIndex) => {
																const isDeletedSoon = getCardDeletionTime(board.scheduledForDeletion ? new Date(board.scheduledForDeletion) : null, colorMode);

																return (
																	<Flex
																		key={boardIndex}
																		justifyContent={'space-between'}
																		gap={{ base: 0, md: 2 }}
																		bg={isDeletedSoon.bg}
																		alignItems={'center'}
																		textAlign={'start'}
																		rounded={'lg'}
																		px={4}
																		py={2}
																	>
																		<Text flex='1' textAlign='left' fontWeight='bold' fontSize='lg'>
																			{board.name}
																		</Text>

																		{board.scheduledForDeletion && (
																			<Badge
																				px={2} py={1}
																				fontWeight={'bold'}
																				borderRadius={'full'}
																				textTransform={'none'}
																				bg={isDeletedSoon.borderColor}
																				color={colorMode === 'light' ? 'white' : 'black'}
																			>
																				{isDeletedSoon.text}
																			</Badge>
																		)}

																		{typeof board.sizeBytes === 'number' && (
																			<Badge
																				px={2} py={1}
																				fontWeight={'bold'}
																				borderRadius={'full'}
																				textTransform={'none'}
																				bg={colorMode === 'light' ? 'alpha500' : 'alpha300'}
																				color={colorMode === 'light' ? 'white' : 'black'}
																			>
																				{formatBytes(board.sizeBytes)}
																			</Badge>
																		)}

																		<IconLinkButton
																			variant={'ghost'}
																			rounded={'full'}
																			icon={<FaLink />}
																			bg={'alpha100'}
																			aria-label={'Open'}
																			alignItems={'center'}
																			justifyContent={'center'}
																			_hover={{ bg: 'alpha300' }}
																			_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
																			to={`/groups/${group.id}/${category.id}/${board.id}`}
																		/>
																	</Flex>
																);
															})}
														</AccordionPanel>
													</AccordionItem>
												</Flex>
											))}
										</AccordionPanel>
									</AccordionItem>
								))}
							</Flex>
						) : (
							<Text flex={1} textAlign='center' fontSize='lg'>
								Trenutno nema dostupnih sekcija.
							</Text>
						)}
					</Accordion>
				</Container>
			</Box>
		</VStack>
	);
}
