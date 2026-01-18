import { Grid } from '@chakra-ui/react';
import { StatCard } from './StatCard';

export type StatItem = {
	value: string | number;
	label: string;
};

export type StatGridProps = {
	stats: StatItem[];
	columns?: number;
};

export function StatGrid({ stats, columns = stats.length }: StatGridProps) {
	return (
		<Grid
			templateColumns={{ base: '1fr', md: `repeat(${Math.min(columns, stats.length)}, 1fr)` }}
			gap={4}
			mb={4}
		>
			{stats.map((stat, index) => (
				<StatCard key={index} value={stat.value} label={stat.label} />
			))}
		</Grid>
	);
}
