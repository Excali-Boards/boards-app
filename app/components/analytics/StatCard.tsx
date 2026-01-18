import { Container } from '~/components/layout/Container';
import { Flex, Text } from '@chakra-ui/react';

export type StatCardProps = {
	value: string | number;
	label: string;
};

export function StatCard({ value, label }: StatCardProps) {
	return (
		<Container>
			<Flex flexDir='column' align='center' justify='center' p={2}>
				<Text fontSize='4xl' fontWeight='bold' color='#9FA0FF'>{value}</Text>
				<Text fontSize='sm' opacity={0.7}>{label}</Text>
			</Flex>
		</Container>
	);
}
