import React, {useMemo, useState} from 'react';
import {Button, DropDownField, Form, InputField} from '@steroidsjs/core/ui/form';
import {Loader} from '@steroidsjs/core/ui/layout';
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import CollectionCard, {ICollection} from '../../../../shared/CollectionCard/CollectionCard';

import {ROUTE_COLLECTION_CREATE} from '../../../index';
import './collections-block.scss';

interface ICollectionsBlockProps {
	userId: number | string;
	isCurrentUser: boolean;
	isAvailable: boolean;
}

const SORT_OPTIONS = [
	{id: '-updated_at', label: 'По обновлению: новые'},
	{id: 'updated_at', label: 'По обновлению: старые'},
	{id: '-created_at', label: 'По созданию: новые'},
	{id: 'created_at', label: 'По созданию: старые'},
];
const SORT_FORM_ID = 'profile_collections_sort';

function CollectionsBlock(props: ICollectionsBlockProps) {
	const bem = useBem('profile-collections');
	const [ordering, setOrdering] = useState('-updated_at');
	const [query, setQuery] = useState('');
	const fetchConfig = useMemo(() => props.isAvailable ? ({
		url: `/collections/?author_id=${props.userId}&progress_user_id=${props.userId}&ordering=${ordering}`,
		method: 'get',
	}) : null, [ordering, props.isAvailable, props.userId]);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const collections = (data || []) as ICollection[];
	const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
	const filteredCollections = collections.filter(collection =>
		collection.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery));

	if (!props.isAvailable) {
		return (
			<div className={bem.element('empty')}>
				Профиль скрыт настройками приватности
			</div>
		);
	}

	return (
		<div className={bem.block()}>
			<Form
				formId={SORT_FORM_ID}
				className={bem.element('toolbar')}
				initialValues={{ordering, query}}
				onChange={values => {
					setOrdering(values.ordering || '-updated_at');
					setQuery(values.query || '');
				}}
				onBeforeSubmit={() => false}
				useRedux
			>
				<InputField
					attribute='query'
					label='Поиск по названию'
					placeholder='Название подборки'
					className={bem.element('search-field')}
				/>
				<div className={bem.element('toolbar-actions')}>
					<DropDownField
						attribute='ordering'
						label='Сортировка'
						items={SORT_OPTIONS}
						className={bem.element('sort-field')}
					/>

					{props.isCurrentUser && (
						<Button
							className={bem.element('create-button')}
							color='primary'
							toRoute={ROUTE_COLLECTION_CREATE}
						>
							Создать подборку
						</Button>
					)}
				</div>
			</Form>

			{isLoading && !data ? (
				<div className={bem.element('state')}><Loader /></div>
			) : axiosError ? (
				<div className={bem.element('empty')}>Не удалось загрузить подборки</div>
			) : filteredCollections.length > 0 ? (
				<div className={bem.element('grid')}>
					{filteredCollections.map(collection => (
						<CollectionCard key={collection.id} collection={collection} progressUserId={props.userId} />
					))}
				</div>
			) : (
				<div className={bem.element('empty')} role='status'>
					{normalizedQuery ? 'По вашему запросу ничего не найдено' : 'Подборок пока нет'}
				</div>
			)}
		</div>
	);
}

export default CollectionsBlock;
