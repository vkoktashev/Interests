import React, {useCallback} from 'react';
import {DragDropContext, Draggable, Droppable, DropResult} from '@hello-pangea/dnd';
import {FaGripVertical, FaTrash} from 'react-icons/fa';
import {useBem} from '@steroidsjs/core/hooks';

import './collection-items-editor.scss';

export type TCollectionDisplayMode = 'mixed' | 'grouped';
export type TCollectionItemType = 'game' | 'movie' | 'show';

export interface ICollectionEditableItem {
	type: TCollectionItemType;
	id: number | string;
	order_id: number;
	name: string;
	release_year: number | null;
	cover_url: string;
}

interface ICollectionItemsEditorProps {
	items: ICollectionEditableItem[];
	displayMode: TCollectionDisplayMode;
	isDisabled?: boolean;
	onChange: (items: ICollectionEditableItem[]) => void;
	onRemove: (item: ICollectionEditableItem) => void;
}

const TYPE_LABELS = {
	game: 'Игра',
	movie: 'Фильм',
	show: 'Сериал',
};
const ITEM_GROUPS = [
	{type: 'game', title: 'Игры'},
	{type: 'movie', title: 'Фильмы'},
	{type: 'show', title: 'Сериалы'},
] as const;

function reorderItems(items: ICollectionEditableItem[], startIndex: number, endIndex: number) {
	const result = Array.from(items);
	const [removed] = result.splice(startIndex, 1);
	result.splice(endIndex, 0, removed);
	return result;
}

function SortableItem(props: {
	item: ICollectionEditableItem;
	index: number;
	isDisabled: boolean;
	onRemove: (item: ICollectionEditableItem) => void;
}) {
	const bem = useBem('collection-items-editor');
	const {item} = props;

	return (
		<Draggable
			draggableId={`${item.type}-${item.order_id}`}
			index={props.index}
			isDragDisabled={props.isDisabled}
		>
			{(dragProvided, snapshot) => (
				<div
					className={bem.element('item', {dragging: snapshot.isDragging})}
					ref={dragProvided.innerRef}
					{...dragProvided.draggableProps}
					style={dragProvided.draggableProps.style}
				>
					<button
						type='button'
						className={bem.element('drag-handle')}
						aria-label={`Изменить порядок: ${item.name}`}
						{...dragProvided.dragHandleProps}
					>
						<FaGripVertical />
					</button>
					<div className={bem.element('item-cover')}>
						{item.cover_url ? (
							<img src={item.cover_url} alt='' />
						) : (
							<div className={bem.element('item-placeholder')}>
								{item.name?.charAt(0).toUpperCase() || '?'}
							</div>
						)}
					</div>
					<div className={bem.element('item-body')}>
						<div className={bem.element('item-type')}>
							{TYPE_LABELS[item.type]}
							{!!item.release_year && ` · ${item.release_year}`}
						</div>
						<div className={bem.element('item-name')}>{item.name}</div>
					</div>
					<button
						type='button'
						className={bem.element('remove-button')}
						aria-label={`Удалить: ${item.name}`}
						disabled={props.isDisabled}
						onClick={() => props.onRemove(item)}
					>
						<FaTrash />
					</button>
				</div>
			)}
		</Draggable>
	);
}

function SortableList(props: {
	droppableId: string;
	droppableType: string;
	items: ICollectionEditableItem[];
	isDisabled: boolean;
	onRemove: (item: ICollectionEditableItem) => void;
}) {
	const bem = useBem('collection-items-editor');

	return (
		<Droppable droppableId={props.droppableId} direction='vertical' type={props.droppableType}>
			{provided => (
				<div
					className={bem.element('items')}
					ref={provided.innerRef}
					{...provided.droppableProps}
				>
					{props.items.map((item, index) => (
						<SortableItem
							key={`${item.type}-${item.order_id}`}
							item={item}
							index={index}
							isDisabled={props.isDisabled}
							onRemove={props.onRemove}
						/>
					))}
					{provided.placeholder}
				</div>
			)}
		</Droppable>
	);
}

function CollectionItemsEditor(props: ICollectionItemsEditorProps) {
	const bem = useBem('collection-items-editor');
	const onDragEnd = useCallback((result: DropResult) => {
		if (!result.destination || result.destination.index === result.source.index) {
			return;
		}

		if (result.source.droppableId === 'collection-items') {
			props.onChange(reorderItems(
				props.items,
				result.source.index,
				result.destination.index,
			));
			return;
		}
		if (result.source.droppableId !== result.destination.droppableId) {
			return;
		}

		const mediaType = result.source.droppableId as TCollectionItemType;
		const groupItems = props.items.filter(item => item.type === mediaType);
		const movedItem = groupItems[result.source.index];
		const targetItem = groupItems[result.destination.index];
		if (!movedItem || !targetItem) {
			return;
		}

		props.onChange(reorderItems(
			props.items,
			props.items.indexOf(movedItem),
			props.items.indexOf(targetItem),
		));
	}, [props]);

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			{props.displayMode === 'grouped' ? (
				<div className={bem.element('groups')}>
					{ITEM_GROUPS.map(group => {
						const groupItems = props.items.filter(item => item.type === group.type);
						return groupItems.length > 0 && (
							<section className={bem.element('group')} key={group.type}>
								<h3 className={bem.element('group-title')}>{group.title}</h3>
								<SortableList
									droppableId={group.type}
									droppableType={`collection-${group.type}`}
									items={groupItems}
									isDisabled={!!props.isDisabled}
									onRemove={props.onRemove}
								/>
							</section>
						);
					})}
				</div>
			) : (
				<SortableList
					droppableId='collection-items'
					droppableType='collection-items'
					items={props.items}
					isDisabled={!!props.isDisabled}
					onRemove={props.onRemove}
				/>
			)}
		</DragDropContext>
	);
}

export default CollectionItemsEditor;
