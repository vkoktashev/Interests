import React, {useMemo} from 'react';
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import CollectionCard, {ICollection} from '../../../../shared/CollectionCard/CollectionCard';
import './system-collections-block.scss';

function SystemCollectionsBlock() {
	const bem = useBem('home-page');
	const fetchConfig = useMemo(() => ({url: '/collections/system/', method: 'get'}), []);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const collections = (data || []) as ICollection[];

	return (
		<section className={bem.element('section', {collections: true})}>
			<div className={bem.element('collections-head')}>
				<h2 className={bem.element('section-title')}>Подборки редакции</h2>
				<a className={bem.element('trending-note', {cta: true})} href='/editorial-collections'>
					Все подборки
				</a>
			</div>
			{isLoading && !data ? (
				<div className={bem.element('trending-empty')} role='status'>Загрузка подборок...</div>
			) : axiosError ? (
				<div className={bem.element('trending-empty')} role='status'>Не удалось загрузить подборки</div>
			) : collections.length > 0 ? (
				<div className={bem.element('collections-grid')}>
					{collections.slice(0, 3).map(collection => (
						<CollectionCard key={collection.id} collection={collection} />
					))}
				</div>
			) : (
				<div className={bem.element('trending-empty')}>Подборок редакции пока нет</div>
			)}
		</section>
	);
}

export default SystemCollectionsBlock;
