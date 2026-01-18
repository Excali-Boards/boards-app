import { VStack, Box, Divider, Text, Table, Thead, Tbody, Tr, Th, Td, Avatar, Flex, useColorMode, useBreakpointValue } from '@chakra-ui/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CustomTooltip } from '~/components/analytics/CustomTooltip';
import { StatGrid } from '~/components/analytics/StatGrid';
import { formatTime, validateParams } from '~/other/utils';
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
	const { groupId, categoryId } = validateParams(params, ['groupId', 'categoryId']);

	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const DBGroup = await api?.groups.getGroup({ auth: token, groupId });
	if (!DBGroup || 'error' in DBGroup) throw makeResponse(DBGroup, 'Failed to get group.');

	const category = DBGroup.data.categories.find(c => c.id === categoryId);
	if (!category) throw makeResponse(null, 'Category not found.');

	const analytics = await api?.analytics.getCategoryAnalytics({ auth: token, categoryId, groupId });
	if (!analytics || 'error' in analytics) throw makeResponse(analytics, 'Failed to get category analytics.');

	return {
		group: DBGroup.data.group,
		category,
		analytics: analytics.data,
	};
};

export default function CategoryAnalytics() {
	const { group, category, analytics } = useLoaderData<typeof loader>();
	const isMobile = useBreakpointValue({ base: true, md: false });
	const columns = useBreakpointValue({ base: 2, md: 4 });

	const totalStats = analytics.reduce((acc, item) => ({
		totalSessions: acc.totalSessions + item.totalSessions,
		totalActiveSeconds: acc.totalActiveSeconds + item.totalActiveSeconds,
	}), { totalSessions: 0, totalActiveSeconds: 0 });

	const userData = Array.from(analytics.reduce((acc, item) => {
		const existing = acc.get(item.user.userId);
		if (existing) {
			existing.sessions += item.totalSessions;
			existing.hours += item.totalActiveSeconds / 3600;
		} else {
			acc.set(item.user.userId, {
				userId: item.user.userId,
				displayName: item.user.displayName,
				avatarUrl: item.user.avatarUrl,
				sessions: item.totalSessions,
				hours: item.totalActiveSeconds / 3600,
			});
		}
		return acc;
	}, new Map())).map(([_, data]) => ({
		...data,
		time: formatTime(data.hours * 3600, 's', true),
	})).sort((a, b) => b.hours - a.hours);

	const timePieData = userData.map((user, index) => ({
		name: user.displayName,
		value: user.hours,
		color: colorsArray[index % colorsArray.length],
	}));

	const sessionsPieData = userData.map((user, index) => ({
		name: user.displayName,
		value: user.sessions,
		color: colorsArray[index % colorsArray.length],
	}));

	const stats = [
		{ value: totalStats.totalSessions, label: 'Total Sessions' },
		{ value: (totalStats.totalSessions / (userData.length || 1)).toFixed(2), label: 'Avg Sessions per User' },
		{ value: formatTime(totalStats.totalActiveSeconds, 's', true), label: 'Total Active Time' },
		{ value: formatTime(totalStats.totalActiveSeconds / (userData.length || 1), 's', true), label: 'Avg Time per User' },
	];

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1200px' width={{ base: '100%', sm: '95%', md: '90%', xl: '80%' }}>
				<MenuBar
					name={`Analytics: ${category.name}`}
					description={'View activity analytics for all boards in this category.'}
					goBackPath={`/groups/${group.id}`}
					goBackWindow={true}
					customButtons={[{
						type: 'link',
						icon: <FaLink />,
						label: 'View Category',
						tooltip: 'View category',
						to: `/groups/${group.id}/categories/${category.id}`,
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
							<Text fontSize='lg' fontWeight='bold' mb={4}>All Users</Text>

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
							<Text fontSize='lg' opacity={0.7}>No activity data available for this category yet.</Text>
						</Flex>
					</Container>
				)}
			</Box>
		</VStack>
	);
}

