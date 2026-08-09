import { AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Avatar, Box, Text } from '@chakra-ui/react';
import AllBoardsCategorySection, { AllBoardsCategory } from './AllBoardsCategorySection';
import type { PersonalBoardOwnerOutput } from '@excali-boards/boards-api-client';

export type AllBoardsGroup = {
	id: string;
	name?: string;
	categories: AllBoardsCategory[];
};
export type AllBoardsPersonalGroup = AllBoardsGroup & {
	owner: PersonalBoardOwnerOutput;
};

export type AllBoardsGroupSectionProps = {
	group: AllBoardsGroup;
	owner?: AllBoardsPersonalGroup;
};

export default function AllBoardsGroupSection({ group, owner }: AllBoardsGroupSectionProps) {
	return (
		<AccordionItem border='none'>
			<AccordionButton rounded='lg'>
				{owner && <Avatar size='xs' src={owner.owner.avatarUrl || undefined} name={owner.owner.displayName} mr={3} />}
				<Box flex='1' textAlign='left'>
					<Text fontWeight='bold' fontSize='lg'>{owner?.owner.displayName || group.name}</Text>
				</Box>
				<AccordionIcon />
			</AccordionButton>
			<AccordionPanel pb={4} display='flex' flexDir='column' flexWrap='wrap' gap={2}>
				{group.categories.length > 0 ? group.categories.map((category) => (
					<AllBoardsCategorySection key={category.id} category={category} groupId={group.id} ownerId={owner?.owner.userId} />
				)) : (
					<Text p={2} textAlign='center' fontStyle='italic'>No categories in this group.</Text>
				)}
			</AccordionPanel>
		</AccordionItem>
	);
}
