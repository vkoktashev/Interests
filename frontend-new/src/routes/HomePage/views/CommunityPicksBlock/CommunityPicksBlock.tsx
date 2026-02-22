import React, {useMemo} from "react";
import {useBem, useFetch} from "@steroidsjs/core/hooks";
import Image from "../../../../shared/Image";

interface IPickItem {
	id: string | number;
	name: string;
	poster_path?: string;
	backdrop_path?: string;
	release_date?: string;
	overview?: string;
	ratings_count?: number;
	average_user_score?: number;
}

function formatDate(value?: string) {
	if (!value) {
		return 'Дата неизвестна';
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleDateString('ru-RU', {day: 'numeric', month: 'short', year: 'numeric'});
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
		const href = type === 'game' ? `/game/${item.id}` : `/${type}/${item.id}`;
		const imageSrc = item.poster_path || item.backdrop_path || '';

		return (
			<a key={`${type}-${item.id}`} className={bem.element('trending-card')} href={href}>
				<div className={bem.element('trending-card-poster')}>
					{imageSrc ? (
						<Image src={imageSrc} alt={item.name} className={bem.element('trending-card-poster-img')} />
					) : (
						<div className={bem.element('trending-card-poster-fallback')}>
							{(item.name || '?').charAt(0).toUpperCase()}
						</div>
					)}
				</div>
				<div className={bem.element('trending-card-body')}>
					<div className={bem.element('trending-card-top')}>
						<h4 className={bem.element('trending-card-title')} title={item.name}>{item.name}</h4>
						<span className={bem.element('trending-card-score')}>
							{typeof item.average_user_score === 'number' ? item.average_user_score.toFixed(1) : '—'}
						</span>
					</div>
					<div className={bem.element('trending-card-meta')}>
						<span>{formatDate(item.release_date)}</span>
						<span>{item.ratings_count || 0} оценок</span>
					</div>
					{!!item.overview && (
						<p className={bem.element('trending-card-overview')}>
							{item.overview}
						</p>
					)}
				</div>
			</a>
		);
	};

	const renderGroup = (title: string, items: IPickItem[], type: 'game' | 'movie' | 'show', isLoading: boolean) => (
		<div className={bem.element('trending-group')}>
			<div className={bem.element('trending-group-head')}>
				<h3 className={bem.element('trending-group-title')}>{title}</h3>
				{isLoading && <span className={bem.element('trending-loading')}>Загрузка...</span>}
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
				<span className={bem.element('trending-note')}>Топ по сумме баллов</span>
			</div>
			{renderGroup('Игры', games, 'game', gamesLoading)}
			{renderGroup('Фильмы', movies, 'movie', moviesLoading)}
			{renderGroup('Сериалы', shows, 'show', showsLoading)}
		</section>
	);
}

export default CommunityPicksBlock;
