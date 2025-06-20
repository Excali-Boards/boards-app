import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { Card, CardProps, NoCard } from '~/components/layout/Card';
import { SimpleGrid, VStack } from '@chakra-ui/react';
import { RootContext } from '~/components/Context';
import { useContext, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';

export type ListOrGridProps = {
	cards: CardProps[];
	noWhat: string;
	onEdit?: (index: number) => void;
	onDelete?: (index: number) => void;
	onReorder?: (orderedIds: string[]) => void;
	onCancelDeletion?: (index: number) => void;
};

export default function ListOrGrid({
	cards,
	noWhat,
	onEdit,
	onDelete,
	onReorder,
	onCancelDeletion,
}: ListOrGridProps) {
	const { sortType } = useContext(RootContext) || { sortType: 'list' };
	const [items, setItems] = useState(cards.map((card) => card.id));

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over?.id) {
			setItems((items) => {
				const oldIndex = items.indexOf(active.id.toString());
				const newIndex = items.indexOf(over.id.toString());

				const newItems = arrayMove(items, oldIndex, newIndex);
				if (onReorder) onReorder(newItems);
				return newItems;
			});
		}
	};

	const renderCards = () => (
		items.map((id, i) => {
			const card = cards.find((card) => card.id === id);
			if (!card) return <></>;

			return (
				<SortableItem key={id + '|' + i} id={id}>
					<Card
						isScheduledForDeletion={card.isScheduledForDeletion}
						onCancelDeletion={onCancelDeletion ? () => onCancelDeletion(i) : undefined}
						onDelete={onDelete ? () => onDelete(i) : undefined}
						onEdit={onEdit ? () => onEdit(i) : undefined}
						{...card}
					/>
				</SortableItem>
			);
		})
	);

	const renderNormalCards = () => (
		cards.map((card, i) => {
			return (
				<Card
					key={card.id + '|' + i}
					isScheduledForDeletion={card.isScheduledForDeletion}
					onCancelDeletion={onCancelDeletion ? () => onCancelDeletion(i) : undefined}
					onDelete={onDelete ? () => onDelete(i) : undefined}
					onEdit={onEdit ? () => onEdit(i) : undefined}
					{...card}
				/>
			);
		})
	);

	return onReorder ? (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items}>
				{sortType === 'grid' ? (
					<SimpleGrid columns={{ base: 1, md: cards.length < 2 ? cards.length : 2, lg: cards.length < 3 ? cards.length : 3 }} spacing={2} w={'100%'}>
						{cards.length ? renderCards() : <NoCard noWhat={noWhat} />}
					</SimpleGrid>
				) : sortType === 'list' ? (
					<VStack w={'100%'} spacing={2}>
						{cards.length ? renderCards() : <NoCard noWhat={noWhat} />}
					</VStack>
				) : <></>}
			</SortableContext>
		</DndContext>
	) : (
		sortType === 'grid' ? (
			<SimpleGrid columns={{ base: 1, md: cards.length < 2 ? cards.length : 2, lg: cards.length < 3 ? cards.length : 3 }} spacing={2} w={'100%'}>
				{cards.length ? renderNormalCards() : <NoCard noWhat={noWhat} />}
			</SimpleGrid>
		) : sortType === 'list' ? (
			<VStack w={'100%'} spacing={2}>
				{cards.length ? renderNormalCards() : <NoCard noWhat={noWhat} />}
			</VStack>
		) : <></>
	);
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		width: '100%',
		height: '100%',
	};

	return (
		<div ref={setNodeRef} style={style} {...attributes} {...listeners}>
			{children}
		</div>
	);
}
