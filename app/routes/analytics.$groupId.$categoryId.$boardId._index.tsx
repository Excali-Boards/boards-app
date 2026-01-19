import { VStack, Box, Divider, Text, Table, Thead, Tbody, Tr, Th, Td, Avatar, Flex, useColorMode, useBreakpointValue } from '@chakra-ui/react';
import { formatRelativeTime, formatTime, time, validateParams } from '~/other/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CustomTooltip } from '~/components/analytics/CustomTooltip';
import { StatGrid } from '~/components/analytics/StatGrid';
import { Container } from '~/components/layout/Container';
import { makeResponse } from '~/utils/functions.server';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { useLoaderData } from '@remix-run/react';
import { colorsArray } from '~/other/vars';
import { api } from '~/utils/web.server';
import { FaLink } from 'react-icons/fa';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
	const { groupId, categoryId, boardId } = validateParams(params, ['groupId', 'categoryId', 'boardId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBBoard = await api?.boards.getBoard({ auth: token, boardId, categoryId, groupId });
	if (!DBBoard || 'error' in DBBoard) throw makeResponse(DBBoard, 'Failed to get board.');

	const analytics = await api?.analytics.getBoardAnalytics({ auth: token, boardId, categoryId, groupId });
	if (!analytics || 'error' in analytics) throw makeResponse(analytics, 'Failed to get board analytics.');

	return {
		board: DBBoard.data.board,
		category: DBBoard.data.category,
		group: DBBoard.data.group,
		analytics: analytics.data,
	};
};

export default function BoardAnalytics() {
	const { board, category, group, analytics } = useLoaderData<typeof loader>();
	const isMobile = useBreakpointValue({ base: true, md: false });
	const columns = useBreakpointValue({ base: 2, md: 4 });

	const totalStats = analytics.reduce((acc, item) => ({
		totalSessions: acc.totalSessions + item.totalSessions,
		totalActiveSeconds: acc.totalActiveSeconds + item.totalActiveSeconds,
	}), { totalSessions: 0, totalActiveSeconds: 0 });

	const uniqueUsers = new Set(analytics.map(a => a.user.userId)).size;

	const userData = analytics.map((item) => ({
		userId: item.user.userId,
		displayName: item.user.displayName,
		avatarUrl: item.user.avatarUrl,
		sessions: item.totalSessions,
		time: formatTime(item.totalActiveSeconds, 's', true),
		seconds: item.totalActiveSeconds,
		lastActive: formatRelativeTime(new Date(item.lastActivityAt), true),
	})).sort((a, b) => b.seconds - a.seconds);

	const timePieData = userData.map((user, index) => ({
		name: user.displayName,
		value: user.seconds / 3600,
		color: colorsArray[index % colorsArray.length],
	}));

	const sessionsPieData = userData.map((user, index) => ({
		name: user.displayName,
		value: user.sessions,
		color: colorsArray[index % colorsArray.length],
	}));

	const stats = [
		{ value: uniqueUsers, label: 'Total Unique Viewers' },
		{ value: totalStats.totalSessions, label: 'Total Sessions' },
		{ value: formatTime(totalStats.totalActiveSeconds, 's', true), label: 'Total Active Time' },
		{ value: uniqueUsers > 0 ? formatTime(totalStats.totalActiveSeconds / uniqueUsers, 's', true) : '0s', label: 'Avg Time per Viewer' },
	];

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1200px' width={{ base: '100%', sm: '95%', md: '90%', xl: '80%' }}>
				<MenuBar
					name={`Analytics: ${board.name}`}
					description={'View user activity analytics for this board.'}
					goBackPath={`/groups/${group.id}/${category.id}`}
					goBackWindow={true}
					customButtons={[{
						type: 'link',
						icon: <FaLink />,
						label: 'View Board',
						tooltip: 'View board',
						to: `/groups/${group.id}/categories/${category.id}/boards/${board.id}`,
					}]}
				/>

				<Divider my={4} />

				<StatGrid stats={stats} columns={columns} />

				{analytics.length > 0 && userData.length > 0 ? (
					<>
						{userData.length >= 2 && (
							<Box display='grid' gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={4}>
								<Container>
									<Text fontSize='lg' fontWeight='bold' mb={4}>Sessions Distribution</Text>
									<ResponsiveContainer width='100%' height={400}>
										<PieChart>
											<Pie
												data={sessionsPieData}
												cx='50%'
												cy='50%'
												labelLine={false}
												label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
												outerRadius={125}
												fill='#8884d8'
												dataKey='value'
												isAnimationActive={false}
											>
												{sessionsPieData.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<Tooltip content={<CustomTooltip />} />
										</PieChart>
									</ResponsiveContainer>
								</Container>

								<Container>
									<Text fontSize='lg' fontWeight='bold' mb={4}>Active Time Distribution</Text>
									<ResponsiveContainer width='100%' height={400}>
										<PieChart>
											<Pie
												data={timePieData}
												cx='50%'
												cy='50%'
												labelLine={false}
												label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
												outerRadius={125}
												fill='#8884d8'
												dataKey='value'
												isAnimationActive={false}
											>
												{timePieData.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<Tooltip content={<CustomTooltip />} />
										</PieChart>
									</ResponsiveContainer>
								</Container>
							</Box>
						)}

						<Container>
							<Text fontSize='lg' fontWeight='bold' mb={2}>All Users</Text>

							{isMobile ? (
								<VStack spacing={4}>
									{userData.map((user) => (
										<Box key={user.userId} w='100%' p={4} borderWidth={1} borderRadius='md' bg='alpha100'>
											<Flex align='center' gap={2} mb={3}>
												<Avatar size='sm' name={user.displayName} src={user.avatarUrl || undefined} />
												<Text fontWeight='bold' fontSize='md'>{user.displayName}</Text>
											</Flex>

											<Flex justify='space-between'>
												<Text fontSize='sm'>Sessions:</Text>
												<Text fontWeight='bold'>{user.sessions}</Text>
											</Flex>
											<Flex justify='space-between'>
												<Text fontSize='sm'>Active Time:</Text>
												<Text fontWeight='bold'>{user.time}</Text>
											</Flex>
											<Flex justify='space-between'>
												<Text fontSize='sm'>Last Active:</Text>
												<Text fontWeight='bold'>{user.lastActive}</Text>
											</Flex>
										</Box>
									))}
								</VStack>
							) : (
								<Box overflowX='auto'>
									<Table variant='simple' size='md'>
										<Thead>
											<Tr>
												<Th>User</Th>
												<Th isNumeric>Sessions</Th>
												<Th isNumeric>Active Time</Th>
												<Th isNumeric>Last Active</Th>
											</Tr>
										</Thead>
										<Tbody>
											{userData.map((user) => (
												<Tr key={user.userId}>
													<Td>
														<Flex align='center' gap={2}>
															<Avatar size='sm' name={user.displayName} src={user.avatarUrl || undefined} />
															<Text fontWeight='bold' fontSize='lg'>{user.displayName}</Text>
														</Flex>
													</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{user.sessions}</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{user.time}</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{user.lastActive}</Td>
												</Tr>
											))}
										</Tbody>
									</Table>
								</Box>
							)}
						</Container>
					</>
				) : (
					<Container>
						<Flex flexDir='column' align='center' justify='center' p={8}>
							<Text fontSize='lg' opacity={0.7}>No activity data available for this board yet.</Text>
						</Flex>
					</Container>
				)}
			</Box>
		</VStack>
	);
}

