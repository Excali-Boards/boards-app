import { Avatar, Box, Divider, Flex, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useBreakpointValue } from '@chakra-ui/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CustomTooltip } from '~/components/analytics/CustomTooltip';
import MenuBar, { MenuBarProps } from '~/components/layout/MenuBar';
import { formatRelativeTime, formatTime } from '~/other/utils';
import { StatGrid } from '~/components/analytics/StatGrid';
import { Container } from '~/components/layout/Container';
import { colorsArray } from '~/other/vars';

export type AnalyticsUserItem = {
	user: {
		userId: string;
		displayName: string;
		avatarUrl: string | null;
	};
	board: {
		boardId: string;
		name: string;
		category?: {
			name: string;
			group?: {
				name: string;
			};
		};
	};
	totalSessions: number;
	totalActiveSeconds: number;
	lastActivityAt: string | Date;
};

export type AggregatedUser = {
	userId: string;
	displayName: string;
	avatarUrl: string | null;
	sessions: number;
	totalActiveSeconds: number;
	hours: number;
	time: string;
	lastActiveAt: number;
	lastActive: string;
};

export type AggregatedBoard = {
	boardId: string;
	boardName: string;
	hours: number;
	detail?: string;
};

export type AnalyticsUsersProps = {
	analytics: AnalyticsUserItem[];
	menuBar: MenuBarProps;
	emptyMessage: string;
};

export default function AnalyticsUsers({ analytics, menuBar, emptyMessage }: AnalyticsUsersProps) {
	const isMobile = useBreakpointValue({ base: true, md: false });
	const columns = useBreakpointValue({ base: 2, md: 4 });

	const totalStats = analytics.reduce((acc, item) => ({
		totalSessions: acc.totalSessions + item.totalSessions,
		totalActiveSeconds: acc.totalActiveSeconds + item.totalActiveSeconds,
	}), { totalSessions: 0, totalActiveSeconds: 0 });

	const userData = Array.from(analytics.reduce((acc, item) => {
		const existing = acc.get(item.user.userId);
		const lastActiveAt = new Date(item.lastActivityAt).getTime();
		if (existing) {
			existing.sessions += item.totalSessions;
			existing.totalActiveSeconds += item.totalActiveSeconds;
			existing.hours = existing.totalActiveSeconds / 3600;
			existing.time = formatTime(existing.totalActiveSeconds, 's', true);
			if (lastActiveAt > existing.lastActiveAt) {
				existing.lastActiveAt = lastActiveAt;
				existing.lastActive = formatRelativeTime(new Date(item.lastActivityAt), true);
			}
		} else {
			acc.set(item.user.userId, {
				userId: item.user.userId,
				displayName: item.user.displayName,
				avatarUrl: item.user.avatarUrl,
				sessions: item.totalSessions,
				totalActiveSeconds: item.totalActiveSeconds,
				hours: item.totalActiveSeconds / 3600,
				time: formatTime(item.totalActiveSeconds, 's', true),
				lastActiveAt,
				lastActive: formatRelativeTime(new Date(item.lastActivityAt), true),
			});
		}

		return acc;
	}, new Map<string, AggregatedUser>()))
		.map(([_, data]) => data)
		.sort((a, b) => b.totalActiveSeconds - a.totalActiveSeconds);

	const boardData = Array.from(analytics.reduce((acc, item) => {
		const existing = acc.get(item.board.boardId);
		if (existing) {
			existing.hours += item.totalActiveSeconds / 3600;
		} else {
			const groupName = item.board.category?.group?.name;
			const categoryName = item.board.category?.name;
			const detail = groupName && categoryName ? `${groupName} • ${categoryName}` : undefined;
			acc.set(item.board.boardId, {
				boardId: item.board.boardId,
				boardName: item.board.name,
				hours: item.totalActiveSeconds / 3600,
				detail,
			});
		}

		return acc;
	}, new Map<string, AggregatedBoard>()))
		.map(([_, data]) => data)
		.sort((a, b) => b.hours - a.hours);

	const boardPieData = boardData.map((board, index) => ({
		name: board.boardName.length > 20 ? board.boardName.slice(0, 20) + '..' : board.boardName,
		fullName: board.boardName,
		detail: board.detail,
		value: board.hours,
		color: colorsArray[index % colorsArray.length],
	}));

	const timePieData = userData.map((user, index) => ({
		name: user.displayName,
		fullName: user.displayName,
		value: user.hours,
		color: colorsArray[index % colorsArray.length],
	}));

	const avgSessions = userData.length > 0 ? totalStats.totalSessions / userData.length : 0;

	const stats = [
		{ value: totalStats.totalSessions, label: 'Total Sessions' },
		{ value: avgSessions % 1 === 0 ? avgSessions : avgSessions.toFixed(2), label: 'Avg Sessions per User' },
		{ value: formatTime(totalStats.totalActiveSeconds, 's', true), label: 'Total Active Time' },
		{ value: formatTime(totalStats.totalActiveSeconds / (userData.length || 1), 's', true), label: 'Avg Time per User' },
	];

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1200px' width={{ base: '100%', sm: '95%', md: '90%', xl: '80%' }}>
				<MenuBar {...menuBar} />

				<Divider my={4} />

				<StatGrid stats={stats} columns={columns} />

				{analytics.length > 0 && userData.length > 0 ? (
					<>
						{userData.length >= 2 && (
							<Box display='grid' gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={4}>
								<Container>
									<Text fontSize='lg' fontWeight='bold' mb={4}>Boards Distribution</Text>
									<ResponsiveContainer width='100%' height={400}>
										<PieChart>
											<Pie
												data={boardPieData}
												cx='50%'
												cy='50%'
												labelLine={false}
												label={({ name, percent }) => percent > 0.01 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
												outerRadius={125}
												fill='#8884d8'
												dataKey='value'
												isAnimationActive={false}
											>
												{boardPieData.map((entry, index) => (
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
												label={({ name, percent }) => percent > 0.01 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
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
							<Text fontSize='lg' opacity={0.7}>{emptyMessage}</Text>
						</Flex>
					</Container>
				)}
			</Box>
		</VStack>
	);
}
