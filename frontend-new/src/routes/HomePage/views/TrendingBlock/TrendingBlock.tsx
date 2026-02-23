import React, {useMemo} from "react";
import {useBem, useFetch} from "@steroidsjs/core/hooks";
import TmdbMediaCard, {ITmdbMediaCardItem} from "../../../../shared/TmdbMediaCard/TmdbMediaCard";

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

	const movieItems = ((moviesData as any)?.results || []) as ITmdbMediaCardItem[];
	const showItems = ((showsData as any)?.results || []) as ITmdbMediaCardItem[];

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
					{movieItems.slice(0, 6).map((item, index) => (
						<TmdbMediaCard
							key={`movie-${item.id || index}`}
							item={item}
							itemType='movie'
							className={bem.element('trending-card')}
						/>
					))}
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
					{showItems.slice(0, 6).map((item, index) => (
						<TmdbMediaCard
							key={`show-${item.id || index}`}
							item={item}
							itemType='show'
							className={bem.element('trending-card')}
						/>
					))}
					{!showsLoading && showItems.length === 0 && (
						<div className={bem.element('trending-empty')}>Не удалось загрузить тренды сериалов</div>
					)}
				</div>
			</div>
		</section>
	);
}

export default TrendingBlock;
