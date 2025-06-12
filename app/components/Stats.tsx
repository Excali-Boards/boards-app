import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { UserStatsOutput } from '@excali-boards/boards-api-client';
import { Box, Text, Flex } from '@chakra-ui/react';

export type StatsProps = {
	stats: UserStatsOutput;
};

export function Stats({ stats }: StatsProps) {
	const perBoardData = stats.perBoardActivity.map((b) => ({
		name: (b.boardName.charAt(0).toUpperCase() + b.boardName.slice(1)),
		minutes: Math.round(b.totalMinutes),
	})).slice(0, 15);

	const pieData = [{
		name: 'Time Spent (min)',
		value: Math.round(stats.boardActivity.totalTimeSeconds / 60),
	}, {
		name: 'Boards Opened',
		value: stats.boardActivity.totalSessions,
	}];

	const CustomTooltip = ({ active, payload, label, isMin }: { active?: boolean; payload?: { name: string; value: number; }[]; label?: string; isMin?: boolean; }) => {
		label = (label?.charAt(0).toUpperCase() || '') + (label?.slice(1) || '');

		if (active && payload && payload.length) {
			return (
				<Box
					bg='white'
					p={2}
					rounded='md'
					shadow='md'
					fontSize='sm'
					color='gray.800'
					border='1px solid #E2E8F0'
				>
					<Text as={'span'}><Text fontWeight={'bold'} as={'span'}>{label || payload[0]?.name || 'Unknown'}</Text>: {`${payload[0]?.value || 0} ${isMin ? 'minutes' : ''}`}</Text>
				</Box>
			);
		}

		return null;
	};

	return (
		<Flex
			gap={2}
			direction={{ base: 'column', md: 'row' }}
			justify='space-between'
			align='stretch'
		>
			<Flex
				flex='2'
				p={4}
				bg='gray.50'
				rounded='2xl'
				shadow='md'
				flexDirection='column'
				alignItems='flex-start'
			>
				<Text fontWeight='semibold' mb={2}>
					Time Spent per Board
				</Text>
				<Box h='250px' w='100%' mt={2}>
					<ResponsiveContainer width='100%' height='100%'>
						<BarChart data={perBoardData}>
							<XAxis
								dataKey='name'
								tick={{ fontSize: 12, fill: '#4A5568' }}
								tickLine={false}
								axisLine={{ stroke: '#E2E8F0' }}
								angle={-70}
								textAnchor='end'
								height={60}
							/>

							<Tooltip
								content={<CustomTooltip isMin />}
								contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', padding: '10px' }}
								itemStyle={{ color: '#333' }}
								labelStyle={{ fontWeight: 'bold', color: '#333' }}
								cursor={{ fill: 'transparent' }}
							/>

							<Bar dataKey='minutes' fill='#48BB78' radius={[8, 8, 0, 0]} barSize={perBoardData.length > 12 ? 30 : perBoardData.length > 8 ? 40 : perBoardData.length > 4 ? 50 : perBoardData.length > 2 ? 60 : 70} />
						</BarChart>
					</ResponsiveContainer>
				</Box>
			</Flex>

			<Box
				flex='1'
				p={4}
				bg='gray.50'
				rounded='2xl'
				shadow='md'
			>
				<Text fontWeight='semibold' mb={2}>
					Summary
				</Text>
				<Box h='250px'>
					<ResponsiveContainer width='100%' height='100%'>
						<PieChart>
							<Pie
								data={pieData}
								dataKey='value'
								nameKey='name'
								outerRadius={80}
								innerRadius={40}
								label
							>
								{pieData.map((_, idx) => (
									<Cell key={idx} fill={idx === 0 ? '#3182CE' : '#F56565'} />
								))}
							</Pie>
							<Tooltip
								content={<CustomTooltip />}
								contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', padding: '10px' }}
								itemStyle={{ color: '#333' }}
								labelStyle={{ fontWeight: 'bold', color: '#333' }}
								cursor={{ fill: 'transparent' }}
							/>
						</PieChart>
					</ResponsiveContainer>
				</Box>
			</Box>
		</Flex>
	);
}
