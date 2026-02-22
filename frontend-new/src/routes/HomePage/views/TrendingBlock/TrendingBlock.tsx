import React, {useMemo} from "react";
import {useBem, useFetch} from "@steroidsjs/core/hooks";
import Image from "../../../../shared/Image";

interface ITrendingItem {
	id: number;
	name: string;
	original_name?: string;
	poster_path?: string;
	backdrop_path?: string;
	release_date?: string;
	vote_average?: number;
	vote_count?: number;
	overview?: string;
}

function formatDate(value?: string) {
	if (!value) {
		return 'Дата неизвестна';
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleDateString('ru-RU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatScore(value?: number) {
	if (typeof value !== 'number') {
		return '—';
	}
	return value.toFixed(1);
}

function TrendingBlock() {
	const bem = useBem('home-page');

	const moviesFetchConfig = useMemo(() => ({
		url: '/movies/trending/',
		method: 'get',
	}), []);
	const showsFetchConfig = useMemo(() => ({
		url: '/shows/trending/',
		method: 'get',
	}), []);

	const {data: moviesData, isLoading: moviesLoading} = useFetch(moviesFetchConfig as any);
	const {data: showsData, isLoading: showsLoading} = useFetch(showsFetchConfig as any);

	const movieItems = ((moviesData as any)?.results || []) as ITrendingItem[];
	const showItems = ((showsData as any)?.results || []) as ITrendingItem[];

	const renderCard = (item: ITrendingItem, type: 'movie' | 'show') => {
		const href = type === 'movie' ? `/movie/${item.id}` : `/show/${item.id}`;
		const imageSrc = item.poster_path || item.backdrop_path || '';

		return (
			<a
				key={`${type}-${item.id}`}
				className={bem.element('trending-card')}
				href={href}
			>
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
						<span className={bem.element('trending-card-score')}>{formatScore(item.vote_average)}</span>
					</div>
					<div className={bem.element('trending-card-meta')}>
						<span>{formatDate(item.release_date)}</span>
						{!!item.vote_count && <span>{item.vote_count} оценок</span>}
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

	return (
		<section className={bem.element('section')}>
			<div className={bem.element('trending-head')}>
				<h2 className={bem.element('section-title')}>Тренды TMDB</h2>
				<span className={bem.element('trending-note')}>Актуальное за день</span>
			</div>

			<div className={bem.element('trending-group')}>
				<div className={bem.element('trending-group-head')}>
					<h3 className={bem.element('trending-group-title')}>Фильмы</h3>
					{moviesLoading && <span className={bem.element('trending-loading')}>Загрузка...</span>}
				</div>
				<div className={bem.element('trending-grid')}>
					{movieItems.slice(0, 6).map(item => renderCard(item, 'movie'))}
					{!moviesLoading && movieItems.length === 0 && (
						<div className={bem.element('trending-empty')}>Не удалось загрузить тренды фильмов</div>
					)}
				</div>
			</div>

			<div className={bem.element('trending-group')}>
				<div className={bem.element('trending-group-head')}>
					<h3 className={bem.element('trending-group-title')}>Сериалы</h3>
					{showsLoading && <span className={bem.element('trending-loading')}>Загрузка...</span>}
				</div>
				<div className={bem.element('trending-grid')}>
					{showItems.slice(0, 6).map(item => renderCard(item, 'show'))}
					{!showsLoading && showItems.length === 0 && (
						<div className={bem.element('trending-empty')}>Не удалось загрузить тренды сериалов</div>
					)}
				</div>
			</div>
		</section>
	);
}

export default TrendingBlock;
