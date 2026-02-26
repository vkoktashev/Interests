import React, {useMemo} from "react";
import {useBem, useFetch} from "@steroidsjs/core/hooks";
import TmdbMediaCard, {ITmdbMediaCardItem} from "../../../../shared/TmdbMediaCard/TmdbMediaCard";

interface IPickItem {
	id: string | number;
	name: string;
	poster_path?: string;
	backdrop_path?: string;
	release_date?: string;
	overview?: string;
	genres?: string;
	platforms?: string;
	tags?: string;
	user_status?: string;
	ratings_count?: number;
	average_user_score?: number;
}

function getUserStatusBadge(type: 'game' | 'movie' | 'show', status?: string) {
	if (!status) {
		return null;
	}
	if (status === 'going') {
		return {label: type === 'game' ? 'В планах' : 'Буду смотреть', tone: 'planned' as const};
	}
	if ((type === 'game' && status === 'completed') || ((type === 'movie' || type === 'show') && status === 'watched')) {
		return {label: type === 'game' ? 'Пройдено' : 'Просмотрено', tone: 'done' as const};
	}
	if ((type === 'game' && status === 'playing') || (type === 'show' && status === 'watching')) {
		return {label: type === 'game' ? 'Играю' : 'Смотрю', tone: 'progress' as const};
	}
	if (status === 'stopped') {
		return {label: 'Дропнуто', tone: 'stopped' as const};
	}
	return null;
}

function CommunityPicksBlock() {
	const bem = useBem('home-page');

	const gamesConfig = useMemo(() => ({url: '/games/top_rated/?limit=6', method: 'get'}), []);
	const moviesConfig = useMemo(() => ({url: '/movies/top_rated/?limit=6', method: 'get'}), []);
	const showsConfig = useMemo(() => ({url: '/shows/top_rated/?limit=6', method: 'get'}), []);

	const {data: gamesData, isLoading: gamesLoading} = useFetch(gamesConfig as any);
	const {data: moviesData, isLoading: moviesLoading} = useFetch(moviesConfig as any);
	const {data: showsData, isLoading: showsLoading} = useFetch(showsConfig as any);

	const games = (((gamesData as any)?.results) || []) as IPickItem[];
	const movies = (((moviesData as any)?.results) || []) as IPickItem[];
	const shows = (((showsData as any)?.results) || []) as IPickItem[];

	const renderCard = (item: IPickItem, type: 'game' | 'movie' | 'show') => {
		const mappedItem: ITmdbMediaCardItem = {
			id: Number.isNaN(Number(item.id)) ? (item.id as any) : Number(item.id),
			name: item.name,
			poster_path: item.poster_path,
			backdrop_path: item.backdrop_path,
			release_date: item.release_date,
			vote_average: item.average_user_score,
			vote_count: item.ratings_count,
			overview: item.overview,
			genres: item.genres,
			platforms: item.platforms,
			tags: item.tags,
			user_status: item.user_status,
		};

		return (
			<TmdbMediaCard
				key={`${type}-${item.id}`}
				item={mappedItem}
				itemType={type}
				statusBadge={getUserStatusBadge(type, item.user_status)}
				className={bem.element('trending-card')}
			/>
		);
	};

	const renderGroup = (title: string, items: IPickItem[], type: 'game' | 'movie' | 'show', isLoading: boolean) => (
		<div className={bem.element('trending-group')}>
			<div className={bem.element('trending-group-head')}>
				<h3 className={bem.element('trending-group-title')}>{title}</h3>
				{isLoading && items.length === 0 && <span className={bem.element('trending-loading')}>Загрузка...</span>}
			</div>
			<div className={bem.element('trending-grid')}>
				{items.map(item => renderCard(item, type))}
				{!isLoading && items.length === 0 && (
					<div className={bem.element('trending-empty')}>Пока недостаточно оценок</div>
				)}
			</div>
		</div>
	);

	return (
		<section className={bem.element('section')}>
			<div className={bem.element('trending-head')}>
				<h2 className={bem.element('section-title')}>Выбор пользователей Interests</h2>
				<a className={bem.element('trending-note', {cta: true})} href='/community-picks'>Полные топы</a>
			</div>
			{renderGroup('Игры', games, 'game', gamesLoading)}
			{renderGroup('Фильмы', movies, 'movie', moviesLoading)}
			{renderGroup('Сериалы', shows, 'show', showsLoading)}
		</section>
	);
}

export default CommunityPicksBlock;
