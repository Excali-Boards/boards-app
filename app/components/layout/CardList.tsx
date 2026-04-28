import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { Card, CardProps, NoCard } from '~/components/layout/Card';
import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { VStack } from '@chakra-ui/react';
import { CSS } from '@dnd-kit/utilities';

export type CardListProps = {
	cards: CardProps[];
	noWhat: string;
	onEdit?: (id: string) => void;
	onDelete?: (id: string) => void;
	onMove?: (id: string) => void;
	onReorder?: (orderedIds: string[]) => void;
	onFlashCreate?: (id: string) => void;
	onForceDelete?: (id: string) => void;
	onCancelDeletion?: (id: string) => void;
};

export default function CardList({
	cards,
	noWhat,
	onEdit,
	onDelete,
	onMove,
	onReorder,
	onFlashCreate,
	onForceDelete,
	onCancelDeletion,
}: CardListProps) {
	const [items, setItems] = useState(cards.map((card) => card.id));
	const isReorderingRef = useRef(false);
	const canReorder = Boolean(onReorder);
	const cardsById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

	useEffect(() => {
		if (isReorderingRef.current) return;

		const newIds = cards.map((card) => card.id);
		const idsChanged = newIds.length !== items.length || newIds.some((id, index) => id !== items[index]);

		if (idsChanged) setItems(newIds);
	}, [cards, items]);

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
	);

	const handleDragEnd = useCallback((event: DragEndEvent) => {
		if (!onReorder) return;

		const { active, over } = event;

		if (over && active.id !== over?.id) {
			isReorderingRef.current = true;

			setItems((items) => {
				const oldIndex = items.indexOf(active.id.toString());
				const newIndex = items.indexOf(over.id.toString());

				const newItems = arrayMove(items, oldIndex, newIndex);
				onReorder(newItems);

				setTimeout(() => {
					isReorderingRef.current = false;
				}, 100);

				return newItems;
			});
		}
	}, [onReorder]);

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={items}>
				<VStack w={'100%'} spacing={2}>
					{cards.length ? items.map((id) => {
						const card = cardsById.get(id);
						if (!card) return null;

						return (
							<SortableItem key={id} id={id} isDisabled={!canReorder}>
								<Card
									onCancelDeletion={onCancelDeletion ? () => onCancelDeletion(id) : undefined}
									onForceDelete={onForceDelete ? () => onForceDelete(id) : undefined}
									onFlashCreate={onFlashCreate ? () => onFlashCreate(id) : undefined}
									onDelete={onDelete ? () => onDelete(id) : undefined}
									onMove={onMove ? () => onMove(id) : undefined}
									onEdit={onEdit ? () => onEdit(id) : undefined}
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
	);
}

function SortableItem({ id, isDisabled, children }: { id: string; isDisabled: boolean; children: React.ReactNode }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id,
		disabled: isDisabled,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition: isDisabled ? 'none' : transition,
		width: '100%',
		height: '100%',
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...(isDisabled ? {} : attributes)}
			{...(isDisabled ? {} : listeners)}
		>
			{children}
		</div>
	);
}
