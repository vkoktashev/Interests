import React, {useCallback, useMemo, useState} from 'react';
import {Button} from '@steroidsjs/core/ui/form';
import {Loader} from '@steroidsjs/core/ui/layout';
import {Link} from '@steroidsjs/core/ui/nav';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';

import {ROUTE_COLLECTION_EDIT, ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW, ROUTE_USER} from '../index';
import './collection-page.scss';

type TDisplayMode = 'mixed' | 'grouped';
type TPrivacy = 'public' | 'private';
type TItemType = 'game' | 'movie' | 'show';

interface ICollectionItem {
	type: TItemType;
	id: number | string;
	order_id: number;
	name: string;
	cover_url: string;
}

interface ICollectionItems {
	games: ICollectionItem[];
	movies: ICollectionItem[];
	shows: ICollectionItem[];
}

interface ICollectionDetail {
	id: number;
	title: string;
	display_mode: TDisplayMode;
	privacy: TPrivacy;
	created_at: string;
	updated_at: string;
	author: {
		id: number;
		username: string;
	};
	counts: {
		games: number;
		movies: number;
		shows: number;
	};
	progress?: {
		completed: number;
		total: number;
		percent: number | null;
	};
	items: ICollectionItems;
	ordered_items: ICollectionItem[];
}
const GROUPS = [
	{key: 'games', title: 'Игры'},
	{key: 'movies', title: 'Фильмы'},
	{key: 'shows', title: 'Сериалы'},
] as const;

const COUNT_LABELS = {
	movies: ['фильм', 'фильма', 'фильмов'],
	games: ['игра', 'игры', 'игр'],
	shows: ['сериал', 'сериала', 'сериалов'],
};

function getCountLabel(count: number, forms: string[]) {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;
	let formIndex = 2;

	if (lastTwoDigits < 11 || lastTwoDigits > 14) {
		if (lastDigit === 1) {
			formIndex = 0;
		} else if (lastDigit >= 2 && lastDigit <= 4) {
			formIndex = 1;
		}
	}

	return `${count} ${forms[formIndex]}`;
}

function getSummary(collection: ICollectionDetail) {
	return [
		collection.counts.movies ? getCountLabel(collection.counts.movies, COUNT_LABELS.movies) : '',
		collection.counts.games ? getCountLabel(collection.counts.games, COUNT_LABELS.games) : '',
		collection.counts.shows ? getCountLabel(collection.counts.shows, COUNT_LABELS.shows) : '',
	].filter(Boolean).join(', ') || 'Пока без контента';
}

function mixItems(items: ICollectionItems) {
	const mixedItems: ICollectionItem[] = [];
	const groups = [items.games, items.movies, items.shows];
	const maxGroupLength = Math.max(...groups.map(group => group.length));

	for (let index = 0; index < maxGroupLength; index += 1) {
		groups.forEach(group => {
			if (group[index]) {
				mixedItems.push(group[index]);
			}
		});
	}

	return mixedItems;
}

function getItemRoute(item: ICollectionItem) {
	if (item.type === 'game') {
		return {route: ROUTE_GAME, params: {gameId: item.id}};
	}
	if (item.type === 'movie') {
		return {route: ROUTE_MOVIE, params: {movieId: item.id}};
	}
	return {route: ROUTE_SHOW, params: {showId: item.id}};
}

function CollectionItemCard({item}: {item: ICollectionItem}) {
	const bem = useBem('collection-page');
	const itemRoute = getItemRoute(item);

	return (
		<Link
			className={bem.element('item')}
			toRoute={itemRoute.route}
			toRouteParams={itemRoute.params}
			aria-label={item.name || 'Без названия'}
		>
			<div className={bem.element('item-cover')}>
				{item.cover_url ? (
					<img className={bem.element('item-image')} src={item.cover_url} alt={item.name} />
				) : (
					<div className={bem.element('item-placeholder')}>
						{item.name?.charAt(0).toUpperCase() || '?'}
					</div>
				)}
			</div>
			<div className={bem.element('item-tooltip')} role='tooltip'>
				{item.name || 'Без названия'}
			</div>
		</Link>
	);
}

function CollectionPage() {
	const bem = useBem('collection-page');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const currentUser = useSelector(getUser);
	const {collectionId, progressUserId} = useSelector(getRouteParams);
	const [isDeleting, setDeleting] = useState(false);
	const effectiveProgressUserId = progressUserId || currentUser?.id;
	const fetchConfig = useMemo(() => collectionId && ({
		url: `/collections/${collectionId}/${effectiveProgressUserId
			? `?progress_user_id=${encodeURIComponent(effectiveProgressUserId)}`
			: ''}`,
		method: 'get',
	}), [collectionId, effectiveProgressUserId]);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const collection = data as ICollectionDetail;
	const isOwner = collection?.author?.id === currentUser?.id;
	const deleteCollection = useCallback(async () => {
		if (!collection || !isOwner || isDeleting) {
			return;
		}

		if (!window.confirm(`Удалить подборку «${collection.title}»? Это действие нельзя отменить.`)) {
			return;
		}

		setDeleting(true);
		try {
			await http.send('DELETE', `/collections/${collection.id}/`);
			dispatch(showNotification('Подборка удалена', 'success'));
			dispatch(goToRoute(ROUTE_USER, {
				userId: currentUser.id,
				сategory: 'Подборки',
			}, false, true));
		} catch (requestError) {
			const responseData = requestError?.response?.data;
			dispatch(showNotification(
				responseData?.error
					|| responseData?.detail
					|| 'Не удалось удалить подборку',
				'danger',
			));
			setDeleting(false);
		}
	}, [collection, currentUser?.id, dispatch, http, isDeleting, isOwner]);

	if (isLoading && !collection) {
		return <Loader />;
	}

	if (axiosError || !collection) {
		return (
			<div className={bem.block()}>
				<div className={bem.element('state')}>Не удалось загрузить подборку</div>
			</div>
		);
	}

	const allItems = collection.ordered_items || mixItems(collection.items);

	return (
		<div className={bem.block()}>
			<header className={bem.element('header')}>
				<div className={bem.element('heading')}>
					<div className={bem.element('eyebrow')}>Подборка</div>
					<h1 className={bem.element('title')}>{collection.title}</h1>
					<div className={bem.element('meta')}>
						<Link
							className={bem.element('author')}
							toRoute={ROUTE_USER}
							toRouteParams={{userId: collection.author.id}}
						>
							{collection.author.username}
						</Link>
						<span>{getSummary(collection)}</span>
					</div>
				</div>

				<div className={bem.element('header-actions')}>
					<div className={bem.element('settings-badges')}>
						<div className={bem.element('setting-badge')}>
							{collection.display_mode === 'mixed' ? 'Смешанная' : 'Раздельная'}
						</div>
						<div className={bem.element('setting-badge')}>
							{collection.privacy === 'public' ? 'Публичная' : 'Приватная'}
						</div>
					</div>
					{isOwner && (
						<div className={bem.element('owner-actions')}>
							<Button
								className={bem.element('edit-button')}
								color='secondary'
								toRoute={ROUTE_COLLECTION_EDIT}
								toRouteParams={{
									collectionId: collection.id,
									progressUserId: effectiveProgressUserId,
								}}
								showQueryParams
							>
								Редактировать
							</Button>
							<Button
								type='button'
								className={bem.element('delete-button')}
								color='danger'
								outline
								disabled={isDeleting}
								onClick={deleteCollection}
							>
								{isDeleting ? 'Удаляем...' : 'Удалить'}
							</Button>
						</div>
					)}
				</div>
			</header>

			{!!collection.progress?.total && collection.progress.percent !== null && (
				<div className={bem.element('progress')}>
					<div className={bem.element('progress-value')}>
						{collection.progress.percent}%
					</div>
					<div className={bem.element('progress-track')}>
						<div
							className={bem.element('progress-fill')}
							style={{width: `${collection.progress.percent}%`}}
						/>
					</div>
				</div>
			)}

			{allItems.length === 0 ? (
				<div className={bem.element('state')}>В подборке пока нет контента</div>
			) : collection.display_mode === 'mixed' ? (
				<div className={bem.element('items')}>
					{allItems.map(item => (
						<CollectionItemCard item={item} key={`${item.type}-${item.id}`} />
					))}
				</div>
			) : (
				<div className={bem.element('groups')}>
					{GROUPS.map(group => collection.items[group.key].length > 0 && (
						<section className={bem.element('group')} key={group.key}>
							<div className={bem.element('group-header')}>
								<h2 className={bem.element('group-title')}>{group.title}</h2>
								<span className={bem.element('group-count')}>
									{collection.items[group.key].length}
								</span>
							</div>
							<div className={bem.element('items')}>
								{collection.items[group.key].map(item => (
									<CollectionItemCard item={item} key={`${item.type}-${item.id}`} />
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}

export default CollectionPage;
