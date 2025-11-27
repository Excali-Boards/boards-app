import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { Card, CardProps, NoCard } from '~/components/layout/Card';
import { useCallback, useState, useEffect, useRef } from 'react';
import { VStack } from '@chakra-ui/react';
import { CSS } from '@dnd-kit/utilities';

export type CardListProps = {
	cards: CardProps[];
	noWhat: string;
	onEdit?: (index: number) => void;
	onDelete?: (index: number) => void;
	onReorder?: (orderedIds: string[]) => void;
	onFlashCreate?: (index: number) => void;
	onForceDelete?: (index: number) => void;
	onCancelDeletion?: (index: number) => void;
};

export default function CardList({
	cards,
	noWhat,
	onEdit,
	onDelete,
	onReorder,
	onFlashCreate,
	onForceDelete,
	onCancelDeletion,
}: CardListProps) {
	const [items, setItems] = useState(cards.map((card) => card.id));
	const isReorderingRef = useRef(false);

	useEffect(() => {
		if (isReorderingRef.current) return;

		const newIds = cards.map((card) => card.id);
		const currentIds = items;

		const idsChanged = newIds.length !== currentIds.length ||
			newIds.some((id) => !currentIds.includes(id)) ||
			currentIds.some((id) => !newIds.includes(id));

		if (idsChanged) setItems(newIds);
	}, [cards, items]);

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
	);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over?.id) {
			isReorderingRef.current = true;

			setItems((items) => {
				const oldIndex = items.indexOf(active.id.toString());
				const newIndex = items.indexOf(over.id.toString());

				const newItems = arrayMove(items, oldIndex, newIndex);
				if (onReorder) {
					onReorder(newItems);
				}

				setTimeout(() => {
					isReorderingRef.current = false;
				}, 100);

				return newItems;
			});
		}
	}, [onReorder]);

	return onReorder ? (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items}>
				<VStack w={'100%'} spacing={2}>
					{cards.length ? items.map((id, i) => {
						const card = cards.find((card) => card.id === id);
						if (!card) return <></>;

						return (
							<SortableItem key={id + '|' + i} id={id}>
								<Card
									onCancelDeletion={onCancelDeletion ? () => onCancelDeletion(i) : undefined}
									onForceDelete={onForceDelete ? () => onForceDelete(i) : undefined}
									onFlashCreate={onFlashCreate ? () => onFlashCreate(i) : undefined}
									onDelete={onDelete ? () => onDelete(i) : undefined}
									onEdit={onEdit ? () => onEdit(i) : undefined}
									{...card}
								/>
							</SortableItem>
						);
					}) : (
						<NoCard noWhat={noWhat} />
					)}
				</VStack>
			</SortableContext>
		</DndContext>
	) : (
		<VStack w={'100%'} spacing={2}>
			{cards.length ? cards.map((card, i) => (
				<Card
					onCancelDeletion={onCancelDeletion ? () => onCancelDeletion(i) : undefined}
					onFlashCreate={onFlashCreate ? () => onFlashCreate(i) : undefined}
					onDelete={onDelete ? () => onDelete(i) : undefined}
					onEdit={onEdit ? () => onEdit(i) : undefined}
					key={card.id + '|' + i}
					{...card}
				/>
			)) : (
				<NoCard noWhat={noWhat} />
			)}
		</VStack>
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
