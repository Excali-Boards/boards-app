import { Box, Text, useColorMode } from '@chakra-ui/react';
import { formatTime } from '~/other/utils';

export type TooltipPayload = {
	name: string;
	value: number;
	color: string;
	payload?: {
		fullName?: string;
		detail?: string;
	};
};

export type CustomTooltipProps = {
	label?: string;
	active?: boolean;
	payload?: TooltipPayload[];
};

export function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
	const { colorMode } = useColorMode();
	const isDark = colorMode === 'dark';

	if (!active || !payload || payload.length === 0) return null;

	return (
		<Box
			bg={isDark ? 'brand800' : 'white'}
			borderRadius='md'
			border='1px solid'
			boxShadow='lg'
			px={3}
			py={2}
		>
			{label && (
				<Text fontWeight='bold' mb={1} fontSize='sm'>
					{label}
				</Text>
			)}

			{payload.map((entry, index: number) => {
				const isHours = typeof entry.value === 'number' && entry.value < 100 && entry.value % 1 !== 0;
				const displayValue = isHours ? formatTime(entry.value * 3600, 's', true) : entry.value;
				const fullName = entry.payload?.fullName || entry.name;
				const detail = entry.payload?.detail;

				return (
					<Box key={index}>
						<Text fontSize='sm' color={entry.color} fontWeight='semibold'>
							{fullName}: {displayValue}
						</Text>
						{detail && (
							<Text fontSize='xs' opacity={0.8}>
								{detail}
							</Text>
						)}
					</Box>
				);
			})}
		</Box>
	);
}
