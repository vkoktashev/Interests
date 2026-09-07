import React, {useMemo, useState} from 'react';
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import CollectionCard, {ICollection} from '../../shared/CollectionCard/CollectionCard';
import './editorial-collections-page.scss';

function EditorialCollectionsPage() {
	const bem = useBem('editorial-collections-page');
	const [query, setQuery] = useState('');
	const fetchConfig = useMemo(() => ({url: '/collections/system/', method: 'get'}), []);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const collections = (data || []) as ICollection[];
	const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
	const filteredCollections = collections.filter(collection =>
		collection.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery));

	return (
		<div className={bem.block()}>
			<header className={bem.element('header')}>
				<h1 className={bem.element('title')}>Подборки редакции</h1>
				<p className={bem.element('subtitle')}>Тематические списки фильмов, сериалов и игр от редакции Interests.</p>
				<label className={bem.element('search')}>
					<span>Поиск по названию</span>
					<input
						type='search'
						className={bem.element('input')}
						placeholder='Название подборки'
						value={query}
						onChange={event => setQuery(event.target.value)}
					/>
				</label>
			</header>
			{isLoading && !data ? (
				<div className={bem.element('state')} role='status'>Загрузка подборок...</div>
			) : axiosError ? (
				<div className={bem.element('state')} role='status'>Не удалось загрузить подборки</div>
			) : filteredCollections.length > 0 ? (
				<div className={bem.element('grid')}>
					{filteredCollections.map(collection => (
						<CollectionCard key={collection.id} collection={collection} />
					))}
				</div>
			) : (
				<div className={bem.element('state')} role='status'>
					{normalizedQuery ? 'По вашему запросу ничего не найдено' : 'Подборок редакции пока нет'}
				</div>
			)}
		</div>
	);
}

export default EditorialCollectionsPage;
