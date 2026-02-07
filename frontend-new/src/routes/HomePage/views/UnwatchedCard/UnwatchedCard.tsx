import React, {useMemo} from "react";
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_SHOW, ROUTE_UNWATCHED} from '../../../index';

interface IUnwatchedCardProps {
	loggedIn: boolean;
}

function getEpisodesCount(show) {
	return show?.seasons?.reduce((sum, season) => (
		sum + (season?.episodes?.length || 0)
	), 0) || 0;
}

function formatEpisodes(count: number) {
	if (count % 10 === 1 && count % 100 !== 11) return `${count} серия`;
	if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
		return `${count} серии`;
	}
	return `${count} серий`;
}

function UnwatchedCard({loggedIn}: IUnwatchedCardProps) {
	const bem = useBem('home-page');

	const fetchConfig = useMemo(() => loggedIn && ({
		url: `/shows/show/unwatched_episodes/`,
		method: 'get',
	}), [loggedIn]);

	const {data: unwatched, isLoading} = useFetch(fetchConfig as any);

	const items = useMemo(() => {
		if (!unwatched?.length) return [];
		return unwatched
			.map((show) => ({
				id: show.tmdb_id,
				name: show.tmdb_name,
				episodes: getEpisodesCount(show),
			}))
			.filter(item => item.episodes > 0)
			.sort((a, b) => b.episodes - a.episodes)
			.slice(0, 3);
	}, [unwatched]);

	return (
		<div className={bem.element('card')}>
			<p className={bem.element('card-title')}>Непросмотренные серии</p>
			<p className={bem.element('card-value')}>
				{loggedIn ? (
					<Link className={bem.element('link')} toRoute={ROUTE_UNWATCHED}>
						Перейти в непросмотренное
					</Link>
				) : (
					"Войдите, чтобы увидеть список"
				)}
			</p>
			<div className={bem.element('card-list')}>
				{isLoading && loggedIn && (
					<div className={bem.element('card-list-item')}>Загрузка...</div>
				)}
				{!isLoading && loggedIn && items.length === 0 && (
					<div className={bem.element('card-list-item')}>Все серии просмотрены</div>
				)}
				{items.map((item) => (
					<div className={bem.element('card-list-item')} key={item.id}>
						<Link
							className={bem.element('link')}
							toRoute={ROUTE_SHOW}
							toRouteParams={{showId: item.id}}>
							{item.name}
						</Link>
						<span className={bem.element('card-list-count')}>
							{formatEpisodes(item.episodes)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export default UnwatchedCard;
