import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Button, DropDownField, Form, InputField, TextField} from '@steroidsjs/core/ui/form';
import {Loader} from '@steroidsjs/core/ui/layout';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';

import {ROUTE_COLLECTION} from '../index';
import CollectionItemsEditor, {ICollectionEditableItem} from '../../shared/CollectionItemsEditor';
import CollectionContentSearch from '../CollectionCreatePage/CollectionContentSearch';
import './collection-edit-page.scss';

type TDisplayMode = 'mixed' | 'grouped';
type TPrivacy = 'public' | 'private';
type ICollectionItem = ICollectionEditableItem;

interface ICollectionDetail {
	id: number;
	title: string;
	description?: string;
	display_mode: TDisplayMode;
	privacy: TPrivacy;
	updated_at: string;
	author: {
		id: number;
	};
	ordered_items: ICollectionItem[];
}

const FORM_ID = 'collection_edit_form';
const DISPLAY_MODE_ITEMS = [
	{id: 'mixed', label: 'Смешанная'},
	{id: 'grouped', label: 'Раздельная'},
];
const PRIVACY_ITEMS = [
	{id: 'public', label: 'Публичная'},
	{id: 'private', label: 'Приватная'},
];
function CollectionEditPage() {
	const bem = useBem('collection-edit-page');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const currentUser = useSelector(getUser);
	const {collectionId} = useSelector(getRouteParams);
	const formValues = useSelector(state => getFormValues(state, FORM_ID));
	const [items, setItems] = useState<ICollectionItem[]>([]);
	const [isSaving, setSaving] = useState(false);
	const [isAddingItem, setAddingItem] = useState(false);
	const [removingItemKey, setRemovingItemKey] = useState('');
	const [error, setError] = useState('');
	const fetchConfig = useMemo(() => collectionId && ({
		url: `/collections/${collectionId}/`,
		method: 'get',
	}), [collectionId]);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const collection = data as ICollectionDetail;
	const isOwner = collection?.author?.id === currentUser?.id;
	const title = formValues?.title?.trim() || '';
	const displayMode = (formValues?.display_mode || collection?.display_mode) as TDisplayMode;

	useEffect(() => {
		if (collection?.ordered_items) {
			setItems(collection.ordered_items);
		}
	}, [collection?.id, collection?.updated_at]);

	const addItem = useCallback(async (item: ICollectionItem) => {
		if (items.some(currentItem => (
			currentItem.type === item.type && currentItem.order_id === item.order_id
		))) {
			return;
		}

		setError('');
		setAddingItem(true);
		try {
			await http.post(`/collections/${collection.id}/add_item/`, {
				media_type: item.type,
				object_id: item.order_id,
			});
			setItems(currentItems => [...currentItems, item]);
		} catch (requestError) {
			const responseData = requestError?.response?.data;
			setError(
				responseData?.error
					|| responseData?.detail
					|| 'Не удалось добавить элемент',
			);
			throw requestError;
		} finally {
			setAddingItem(false);
		}
	}, [collection?.id, http, items]);

	const removeItem = useCallback(async (item: ICollectionItem) => {
		if (!window.confirm(`Удалить «${item.name}» из подборки?`)) {
			return;
		}

		const itemKey = `${item.type}-${item.order_id}`;
		setError('');
		setRemovingItemKey(itemKey);
		try {
			await http.post(`/collections/${collection.id}/remove_item/`, {
				media_type: item.type,
				object_id: item.order_id,
			});
			setItems(currentItems => currentItems.filter(currentItem => (
				currentItem.type !== item.type || currentItem.order_id !== item.order_id
			)));
			dispatch(showNotification('Элемент удалён из подборки', 'success'));
		} catch (requestError) {
			const responseData = requestError?.response?.data;
			setError(
				responseData?.error
				|| responseData?.detail
				|| 'Не удалось удалить элемент',
			);
		} finally {
			setRemovingItemKey('');
		}
	}, [collection?.id, dispatch, http]);

	const onSubmit = useCallback(async (values: {
		title: string;
		description?: string;
		display_mode: TDisplayMode;
		privacy: TPrivacy;
	}) => {
		if (!collection || !isOwner) {
			return;
		}

		setError('');
		setSaving(true);
		try {
			await http.send('PATCH', `/collections/${collection.id}/`, {
				title: values.title.trim(),
				description: (values.description || '').trim(),
				display_mode: values.display_mode,
				privacy: values.privacy,
			});
			await http.post(`/collections/${collection.id}/reorder/`, {
				items: items.map(item => ({
					media_type: item.type,
					object_id: item.order_id,
					caption: item.caption || '',
				})),
			});
		} catch (requestError) {
			const responseData = requestError?.response?.data;
			setError(
				responseData?.title?.[0]
				|| responseData?.description?.[0]
				|| responseData?.error
				|| responseData?.detail
				|| 'Не удалось сохранить подборку',
			);
			return;
		} finally {
			setSaving(false);
		}

		dispatch(showNotification('Подборка обновлена!', 'success'));
		dispatch(goToRoute(ROUTE_COLLECTION, {collectionId: collection.id}));
	}, [collection, dispatch, http, isOwner, items]);

	if (isLoading && !collection) {
		return <Loader />;
	}

	if (axiosError || !collection || !isOwner) {
		return (
			<div className={bem.block()}>
				<div className={bem.element('state')}>
					Редактирование этой подборки недоступно
				</div>
			</div>
		);
	}

	return (
		<div className={bem.block()}>
			<div className={bem.element('body')}>
				<header className={bem.element('header')}>
					<div className={bem.element('eyebrow')}>Подборки</div>
					<h1 className={bem.element('title')}>Редактировать подборку</h1>
				</header>

				<Form
					key={`${collection.id}-${collection.updated_at}`}
					formId={FORM_ID}
					initialValues={{
						title: collection.title,
						description: collection.description || '',
						display_mode: collection.display_mode,
						privacy: collection.privacy,
					}}
					onSubmit={onSubmit}
					className={bem.element('form')}
					useRedux
				>
					<div className={bem.element('fields')}>
						<div className={bem.element('wide-field')}>
							<InputField
								attribute='title'
								label='Название'
								className={bem.element('field')}
								inputProps={{maxLength: 200, autoComplete: 'off'}}
								required
							/>
						</div>
						<div className={bem.element('wide-field')}>
							<TextField
								attribute='description'
								label='Описание'
								placeholder='О чём эта подборка'
								className={bem.element('field')}
								inputProps={{maxLength: 2000, rows: 3}}
							/>
						</div>
						<DropDownField
							attribute='display_mode'
							label='Тип подборки'
							items={DISPLAY_MODE_ITEMS}
							className={bem.element('field')}
						/>
						<DropDownField
							attribute='privacy'
							label='Приватность'
							items={PRIVACY_ITEMS}
							className={bem.element('field')}
						/>
					</div>

					<section className={bem.element('order-section')}>
						<h2 className={bem.element('section-title')}>Контент</h2>
						<div className={bem.element('content-search')}>
							<CollectionContentSearch
								selectedItems={items}
								onAdd={addItem}
							/>
						</div>

						{items.length > 0 ? (
							<CollectionItemsEditor
								items={items}
								displayMode={displayMode}
								isDisabled={isAddingItem || !!removingItemKey}
								onChange={setItems}
								onRemove={removeItem}
							/>
						) : (
							<div className={bem.element('empty')}>В подборке пока нет контента</div>
						)}
					</section>

					{!!error && <div className={bem.element('error')}>{error}</div>}

					<div className={bem.element('actions')}>
						<Button
							type='button'
							color='secondary'
							toRoute={ROUTE_COLLECTION}
							toRouteParams={{collectionId: collection.id}}
							className={bem.element('cancel-button')}
						>
							Отмена
						</Button>
						<Button
							type='submit'
							color='primary'
							disabled={!title || isSaving || isAddingItem || !!removingItemKey}
							className={bem.element('submit-button')}
						>
							{isSaving ? 'Сохраняем...' : 'Сохранить'}
						</Button>
					</div>
				</Form>
			</div>
		</div>
	);
}

export default CollectionEditPage;
