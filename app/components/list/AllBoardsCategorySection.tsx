import { AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Flex, Text } from '@chakra-ui/react';
import type { GetAllSortedOutput, PersonalCategoryOutput } from '@excali-boards/boards-api-client';
import AllBoardsBoardRow, { AllBoardsBoard } from './AllBoardsBoardRow';

export type GroupCategory = GetAllSortedOutput[number]['categories'][number];
export type AllBoardsCategory = Omit<PersonalCategoryOutput | GroupCategory, 'boards'> & { boards: AllBoardsBoard[] };

export type AllBoardsCategorySectionProps = {
	category: AllBoardsCategory;
	groupId: string;
};

export default function AllBoardsCategorySection({ category, groupId }: AllBoardsCategorySectionProps) {
	return (
		<Flex flex={1} bg='alpha100' p={2} rounded='lg' gap={2} flexDir='column'>
			<AccordionItem border='none'>
				<AccordionButton rounded='lg'>
					<Text flex='1' textAlign='left' fontWeight='bold' fontSize='lg'>{category.name}</Text>
					<AccordionIcon />
				</AccordionButton>
				<AccordionPanel pb={4} display='flex' flexDir='column' flexWrap='wrap' gap={2}>
					{category.boards.length > 0 ? category.boards.map((board) => (
						<AllBoardsBoardRow key={board.id} board={board} to={`/groups/${groupId}/${category.id}/${board.id}`} />
					)) : (
						<Text p={2} textAlign='center' fontStyle='italic'>No boards in this category.</Text>
					)}
				</AccordionPanel>
			</AccordionItem>
		</Flex>
	);
}
