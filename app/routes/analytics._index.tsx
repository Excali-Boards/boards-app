import { VStack, Box, Divider, Text, Table, Thead, Tbody, Tr, Th, Td, Flex, useColorMode, useBreakpointValue } from '@chakra-ui/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getIpHeaders, makeResponse } from '~/utils/functions.server';
import { CustomTooltip } from '~/components/analytics/CustomTooltip';
import { StatGrid } from '~/components/analytics/StatGrid';
import { Container } from '~/components/layout/Container';
import { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/utils/auth.server';
import MenuBar from '~/components/layout/MenuBar';
import { useLoaderData } from '@remix-run/react';
import { formatTime } from '~/other/utils';
import { colorsArray } from '~/other/vars';
import { api } from '~/utils/web.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const token = await authenticator.isAuthenticated(request);
	if (!token) throw makeResponse(null, 'You are not authorized to view this page.');

	const ipHeaders = getIpHeaders(request);
	if (!ipHeaders) throw makeResponse(null, 'Failed to get client IP.');

	const DBAnalytics = await api?.analytics.getUserAnalytics({ auth: token, headers: ipHeaders });
	if (!DBAnalytics || 'error' in DBAnalytics) throw makeResponse(DBAnalytics, 'Failed to get analytics.');

	return { analytics: DBAnalytics.data };
};

export default function UserAnalytics() {
	const { analytics } = useLoaderData<typeof loader>();

	const isMobile = useBreakpointValue({ base: true, md: false });
	const columns = useBreakpointValue({ base: 2, md: 4 });

	const totalStats = analytics.reduce((acc, item) => ({
		totalSessions: acc.totalSessions + item.totalSessions,
		totalActiveSeconds: acc.totalActiveSeconds + item.totalActiveSeconds,
	}), { totalSessions: 0, totalActiveSeconds: 0 });

	const timePieData = analytics.map((info, index) => ({
		name: info.board.name.length > 20 ? info.board.name.slice(0, 20) + '..' : info.board.name,
		value: info.totalActiveSeconds / 3600,
		color: colorsArray[index % colorsArray.length],
	}));

	const sessionsPieData = analytics.map((info, index) => ({
		name: info.board.name.length > 20 ? info.board.name.slice(0, 20) + '..' : info.board.name,
		value: info.totalSessions,
		color: colorsArray[index % colorsArray.length],
	}));

	const stats = [
		{ value: analytics.length, label: 'Boards Viewed' },
		{ value: totalStats.totalSessions, label: 'Total Sessions' },
		{ value: formatTime(totalStats.totalActiveSeconds, 's', true), label: 'Total Active Time' },
		{ value: analytics.length > 0 ? formatTime(totalStats.totalActiveSeconds / analytics.length, 's', true) : '0s', label: 'Avg Time per Board' },
	];

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1200px' width={{ base: '100%', sm: '95%', md: '90%', xl: '80%' }}>
				<MenuBar
					name='My Activity Analytics'
					description='View your activity across all boards you have access to.'
					goBackPath='/profile'
				/>

				<Divider my={4} />

				<StatGrid stats={stats} columns={columns} />

				{analytics.length > 0 ? (
					<>
						{analytics.length >= 2 && (
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
							<Text fontSize='lg' fontWeight='bold' mb={2}>All Boards</Text>

							{isMobile ? (
								<VStack spacing={4}>
									{analytics.sort((a, b) => b.totalActiveSeconds - a.totalActiveSeconds).map((info) => (
										<Box key={info.board.boardId} w='100%' p={4} borderWidth={1} borderRadius='md' bg='alpha100'>
											<Text fontWeight='bold' fontSize='md'>{info.board.name}</Text>
											<Text fontSize='sm' opacity={0.7} mb={3}>{info.board.category.name} • {info.board.category.group.name}</Text>

											<Flex justify='space-between'>
												<Text fontSize='sm'>Sessions:</Text>
												<Text fontWeight='bold'>{info.totalSessions}</Text>
											</Flex>
											<Flex justify='space-between'>
												<Text fontSize='sm'>Active Time:</Text>
												<Text fontWeight='bold'>{formatTime(info.totalActiveSeconds, 's', true)}</Text>
											</Flex>
										</Box>
									))}
								</VStack>
							) : (
								<Box overflowX='auto'>
									<Table variant='simple' size='md'>
										<Thead>
											<Tr>
												<Th>Board</Th>
												<Th isNumeric>Sessions</Th>
												<Th isNumeric>Active Time</Th>
											</Tr>
										</Thead>
										<Tbody>
											{analytics.sort((a, b) => b.totalActiveSeconds - a.totalActiveSeconds).map((info) => (
												<Tr key={info.board.boardId}>
													<Td>
														<Text fontWeight='bold' fontSize='lg'>{info.board.name}</Text>
														<Text fontSize='sm' opacity={0.7}>{info.board.category.group.name} • {info.board.category.name}</Text>
													</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{info.totalSessions}</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{formatTime(info.totalActiveSeconds, 's', true)}</Td>
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
							<Text fontSize='lg' opacity={0.7}>No activity data available yet.</Text>
						</Flex>
					</Container>
				)}
			</Box>
		</VStack>
	);
}
