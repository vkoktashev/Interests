import React, {useMemo} from 'react';
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';

import {ROUTE_COLLECTION, ROUTE_USER} from '../../routes';
import './item-collections-block.scss';

type TCollectionMediaType = 'game' | 'movie' | 'show';

interface IContainingCollection {
	id: number;
	title: string;
	author: {
		id: number | null;
		username: string;
		is_system?: boolean;
	};
	caption: string;
	position: number;
}

interface IItemCollectionsBlockProps {
	mediaType: TCollectionMediaType;
	objectId?: number | string;
	className?: string;
}

function ItemCollectionsBlock(props: IItemCollectionsBlockProps) {
	const bem = useBem('item-collections-block');
	const fetchConfig = useMemo(() => props.objectId && ({
		url: `/collections/containing/?media_type=${encodeURIComponent(props.mediaType)}`
			+ `&object_id=${encodeURIComponent(props.objectId)}`,
		method: 'get',
	}), [props.mediaType, props.objectId]);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const collections = Array.isArray(data) ? data as IContainingCollection[] : [];

	return (
		<section className={[bem.block(), props.className].filter(Boolean).join(' ')}>
			<h4 className={bem.element('title')}>Входит в подборки</h4>

			{isLoading && collections.length < 1 ? (
				<div className={bem.element('message')}>Загружаем подборки...</div>
			) : axiosError ? (
				<div className={bem.element('message', {error: true})}>
					Не удалось загрузить подборки
				</div>
			) : collections.length < 1 ? (
				<div className={bem.element('message')}>
					Пока не входит ни в одну доступную подборку
				</div>
			) : (
				<div className={bem.element('list')}>
					{collections.map(collection => (
						<article key={collection.id} className={bem.element('card')}>
							<div className={bem.element('header')}>
								<Link
									className={bem.element('link')}
									toRoute={ROUTE_COLLECTION}
									toRouteParams={{collectionId: collection.id}}
								>
									{collection.title}
								</Link>
							</div>
							<div className={bem.element('meta')}>
								<span>
									Автор:{' '}
									{collection.author.id !== null ? (
										<Link
											className={bem.element('author-link')}
											toRoute={ROUTE_USER}
											toRouteParams={{userId: collection.author.id}}
										>
											{collection.author.username}
										</Link>
									) : collection.author.username}
								</span>
								<span aria-hidden='true'>·</span>
								<span>Позиция: {collection.position}</span>
							</div>
							{!!collection.caption?.trim() && (
								<div className={bem.element('caption')}>{collection.caption}</div>
							)}
						</article>
					))}
				</div>
			)}
		</section>
	);
}

export default ItemCollectionsBlock;
