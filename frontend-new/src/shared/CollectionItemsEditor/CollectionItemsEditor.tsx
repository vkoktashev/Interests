import React, {useCallback, useState} from 'react';
import {DragDropContext, Draggable, Droppable, DropResult} from '@hello-pangea/dnd';
import {FaGripVertical, FaTrash} from 'react-icons/fa';
import {useBem} from '@steroidsjs/core/hooks';
import StatusBadge from '../StatusBadge';
import {getGameReleaseStatusBadge} from '../mediaStatus';

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
	game_status?: string | null;
	caption?: string;
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
	onCaptionChange: (item: ICollectionEditableItem, caption: string) => void;
}) {
	const bem = useBem('collection-items-editor');
	const {item} = props;
	const [isCaptionOpen, setCaptionOpen] = useState(false);
	const captionId = `collection-caption-${item.type}-${item.order_id}`;
	const releaseStatusBadge = item.type === 'game'
		? getGameReleaseStatusBadge(item.game_status)
		: null;

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
						<div className={bem.element('item-meta')}>
							<div className={bem.element('item-type')}>
								{TYPE_LABELS[item.type]}
								{!!item.release_year && ` · ${item.release_year}`}
							</div>
							{releaseStatusBadge && (
								<StatusBadge
									label={releaseStatusBadge.label}
									tone={releaseStatusBadge.tone}
									size='sm'
								/>
							)}
						</div>
						<div className={bem.element('item-name')}>{item.name}</div>
						<button
							type='button'
							className={bem.element('caption-toggle')}
							disabled={props.isDisabled}
							aria-expanded={isCaptionOpen}
							aria-controls={isCaptionOpen ? captionId : undefined}
							aria-label={isCaptionOpen ? 'Свернуть подпись' : item.caption?.trim() ? 'Редактировать подпись' : 'Добавить подпись'}
							title={item.caption || undefined}
							onClick={() => setCaptionOpen(value => !value)}
						>
							{isCaptionOpen ? 'Свернуть подпись' : item.caption?.trim() ? `Подпись: ${item.caption}` : '+ Добавить подпись'}
						</button>
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
					{isCaptionOpen && (
						<label className={bem.element('caption-field')}>
							<span>Подпись к элементу</span>
							<textarea
								id={captionId}
								autoFocus
								className={bem.element('caption-input')}
								value={item.caption || ''}
								maxLength={2000}
								rows={2}
								placeholder='Необязательная подпись'
								disabled={props.isDisabled}
								onChange={event => props.onCaptionChange(item, event.target.value)}
							/>
						</label>
					)}
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
	onCaptionChange: (item: ICollectionEditableItem, caption: string) => void;
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
							onCaptionChange={props.onCaptionChange}
						/>
					))}
					{provided.placeholder}
				</div>
			)}
		</Droppable>
	);
}

function CollectionItemsEditor(props: ICollectionItemsEditorProps) {
	const onCaptionChange = (changedItem: ICollectionEditableItem, caption: string) => {
		props.onChange(props.items.map(item =>
			item.type === changedItem.type && item.order_id === changedItem.order_id
				? {...item, caption}
				: item));
	};
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
									onCaptionChange={onCaptionChange}
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
					onCaptionChange={onCaptionChange}
				/>
			)}
		</DragDropContext>
	);
}

export default CollectionItemsEditor;
