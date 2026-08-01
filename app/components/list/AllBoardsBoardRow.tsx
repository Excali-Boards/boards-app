import type { GetAllSortedOutput, PersonalBoardOutput } from '@excali-boards/boards-api-client';
import { Badge, Flex, Text, useColorMode } from '@chakra-ui/react';
import { getCardDeletionTime, formatBytes } from '~/other/utils';
import { IconLinkButton } from '~/components/Button';
import { FaLink } from 'react-icons/fa';

export type GroupBoard = GetAllSortedOutput[number]['categories'][number]['boards'][number];
export type AllBoardsBoard = Omit<PersonalBoardOutput | GroupBoard, 'scheduledForDeletion'> & {
	scheduledForDeletion: Date | string | null;
	scheduledForDeletionText?: string | null;
};

export type AllBoardsBoardRowProps = {
	to: string;
	board: AllBoardsBoard;
};

export default function AllBoardsBoardRow({ board, to }: AllBoardsBoardRowProps) {
	const { colorMode } = useColorMode();
	const isDeletedSoon = getCardDeletionTime(board.scheduledForDeletion ? new Date(board.scheduledForDeletion) : null, colorMode);

	return (
		<Flex justifyContent='space-between' gap={{ base: 0, md: 2 }} bg={isDeletedSoon.bg} alignItems='center' textAlign='start' rounded='lg' px={4} py={2}>
			<Text flex='1' textAlign='left' fontWeight='bold' fontSize='lg'>{board.name}</Text>
			{board.scheduledForDeletion && (
				<Badge px={2} py={1} borderRadius='full' textTransform='none' bg={isDeletedSoon.borderColor} color={colorMode === 'light' ? 'white' : 'black'}>
					{board.scheduledForDeletionText}
				</Badge>
			)}

			<Badge px={2} py={1} borderRadius='full' textTransform='none' bg={colorMode === 'light' ? 'alpha500' : 'alpha600'} color={colorMode === 'light' ? 'white' : 'black'}>
				{formatBytes(board.totalSizeBytes)}
			</Badge>

			<IconLinkButton
				variant='ghost'
				rounded='full'
				icon={<FaLink />}
				bg='alpha100'
				aria-label='Open'
				alignItems='center'
				justifyContent='center'
				_hover={{ bg: 'alpha300' }}
				_active={{ bg: 'alpha300', animation: 'bounce 0.3s ease' }}
				to={to}
			/>
		</Flex>
	);
}
