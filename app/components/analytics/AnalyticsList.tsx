import { Avatar, Box, Divider, Flex, Table, Tbody, Td, Text, Th, Thead, Tr, VStack, useBreakpointValue } from '@chakra-ui/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CustomTooltip } from '~/components/analytics/CustomTooltip';
import MenuBar, { MenuBarProps } from '~/components/layout/MenuBar';
import { StatGrid } from '~/components/analytics/StatGrid';
import { Container } from '~/components/layout/Container';
import { formatTime } from '~/other/utils';
import { colorsArray } from '~/other/vars';
import { useMemo } from 'react';

export type AnalyticsListItem = {
	id: string;
	title: string;
	subtitle?: string;
	sessions: number;
	activeSeconds: number;
	avatarUrl?: string | null;
	lastActive?: string;
};

export type AnalyticsListProps = {
	menuBar: MenuBarProps;
	stats: { value: number | string; label: string }[];
	items: AnalyticsListItem[];
	tableTitle: string;
	nameLabel: string;
	emptyMessage: string;
	showLastActive?: boolean;
};

export function truncateLabel(value: string) {
	return value.length > 20 ? `${value.slice(0, 20)}..` : value;
}

export default function AnalyticsList({
	menuBar,
	stats,
	items,
	tableTitle,
	nameLabel,
	emptyMessage,
	showLastActive = false,
}: AnalyticsListProps) {
	const isMobile = useBreakpointValue({ base: true, md: false });
	const columns = useBreakpointValue({ base: 2, md: 4 });

	const sortedItems = useMemo(
		() => items.slice().sort((a, b) => b.activeSeconds - a.activeSeconds),
		[items],
	);

	const timePieData = sortedItems.map((item, index) => ({
		name: truncateLabel(item.title),
		fullName: item.title,
		detail: item.subtitle,
		value: item.activeSeconds / 3600,
		color: colorsArray[index % colorsArray.length],
	}));

	const sessionsPieData = sortedItems.map((item, index) => ({
		name: truncateLabel(item.title),
		fullName: item.title,
		detail: item.subtitle,
		value: item.sessions,
		color: colorsArray[index % colorsArray.length],
	}));

	return (
		<VStack w='100%' align='center' px={4} spacing={{ base: 8, md: '30px' }} mt={{ base: 8, md: 16 }}>
			<Box maxWidth='1200px' width={{ base: '100%', sm: '95%', md: '90%', xl: '80%' }}>
				<MenuBar {...menuBar} />

				<Divider my={4} />

				<StatGrid stats={stats} columns={columns} />

				{sortedItems.length > 0 ? (
					<>
						{sortedItems.length >= 2 && (
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
												label={({ name, percent }) => percent > 0.01 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
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
							<Text fontSize='lg' fontWeight='bold' mb={2}>{tableTitle}</Text>

							{isMobile ? (
								<VStack spacing={4}>
									{sortedItems.map((item) => (
										<Box key={item.id} w='100%' p={4} borderWidth={1} borderRadius='md' bg='alpha100'>
											<Flex align='center' gap={2} mb={item.subtitle ? 1 : 3}>
												{item.avatarUrl && (
													<Avatar size='sm' name={item.title} src={item.avatarUrl || undefined} />
												)}
												<Text fontWeight='bold' fontSize='md'>{item.title}</Text>
											</Flex>
											{item.subtitle && (
												<Text fontSize='sm' opacity={0.7} mb={3}>{item.subtitle}</Text>
											)}

											<Flex justify='space-between'>
												<Text fontSize='sm'>Sessions:</Text>
												<Text fontWeight='bold'>{item.sessions}</Text>
											</Flex>
											<Flex justify='space-between'>
												<Text fontSize='sm'>Active Time:</Text>
												<Text fontWeight='bold'>{formatTime(item.activeSeconds, 's', true)}</Text>
											</Flex>
											{showLastActive && item.lastActive && (
												<Flex justify='space-between'>
													<Text fontSize='sm'>Last Active:</Text>
													<Text fontWeight='bold'>{item.lastActive}</Text>
												</Flex>
											)}
										</Box>
									))}
								</VStack>
							) : (
								<Box overflowX='auto'>
									<Table variant='simple' size='md'>
										<Thead>
											<Tr>
												<Th>{nameLabel}</Th>
												<Th isNumeric>Sessions</Th>
												<Th isNumeric>Active Time</Th>
												{showLastActive && <Th isNumeric>Last Active</Th>}
											</Tr>
										</Thead>
										<Tbody>
											{sortedItems.map((item) => (
												<Tr key={item.id}>
													<Td>
														<Flex align='center' gap={2}>
															{item.avatarUrl && (
																<Avatar size='sm' name={item.title} src={item.avatarUrl || undefined} />
															)}
															<Flex flexDir='column'>
																<Text fontWeight='bold' fontSize='lg'>{item.title}</Text>
																{item.subtitle && <Text fontSize='sm' opacity={0.7}>{item.subtitle}</Text>}
															</Flex>
														</Flex>
													</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{item.sessions}</Td>
													<Td isNumeric fontWeight='bold' fontSize='lg'>{formatTime(item.activeSeconds, 's', true)}</Td>
													{showLastActive && <Td isNumeric fontWeight='bold' fontSize='lg'>{item.lastActive}</Td>}
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
