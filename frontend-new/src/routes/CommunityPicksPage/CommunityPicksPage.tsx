import React, {useEffect, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import Pagination from '@steroidsjs/core/ui/list/Pagination/Pagination';
import {useBem, useComponents} from '@steroidsjs/core/hooks';
import CategoriesTab from '../../shared/CategoriesTab';
import TmdbMediaCard, {ITmdbMediaCardItem} from '../../shared/TmdbMediaCard/TmdbMediaCard';
import pluralizeRu from '../UnwatchedPage/views/pluralizeRu';
import './community-picks-page.scss';

type TCategory = 'Игры' | 'Фильмы' | 'Сериалы';

type IApiItem = {
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
	weighted_score?: number;
	platform_score?: number | null;
};

type IApiResponse = {
	results: IApiItem[];
	count: number;
	page: number;
	page_size: number;
};

const PAGE_SIZE = 50;
const CATEGORIES: TCategory[] = ['Игры', 'Фильмы', 'Сериалы'];

const CATEGORY_CONFIG: Record<TCategory, {url: string; itemType: 'game' | 'movie' | 'show'}> = {
	Игры: {url: '/games/top_rated/', itemType: 'game'},
	Фильмы: {url: '/movies/top_rated/', itemType: 'movie'},
	Сериалы: {url: '/shows/top_rated/', itemType: 'show'},
};

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

function CommunityPicksPage() {
	const bem = useBem('community-picks-page');
	const {http} = useComponents();

	const [activeCategory, setActiveCategory] = useState<TCategory>('Игры');
	const [pageByCategory, setPageByCategory] = useState<Record<TCategory, number>>({
		Игры: 1,
		Фильмы: 1,
		Сериалы: 1,
	});
	const [dataByCategory, setDataByCategory] = useState<Record<TCategory, IApiResponse>>({
		Игры: {results: [], count: 0, page: 1, page_size: PAGE_SIZE},
		Фильмы: {results: [], count: 0, page: 1, page_size: PAGE_SIZE},
		Сериалы: {results: [], count: 0, page: 1, page_size: PAGE_SIZE},
	});
	const [loadingByCategory, setLoadingByCategory] = useState<Record<TCategory, boolean>>({
		Игры: false,
		Фильмы: false,
		Сериалы: false,
	});

	const currentPage = pageByCategory[activeCategory];
	const currentData = dataByCategory[activeCategory];
	const isLoading = loadingByCategory[activeCategory];
	const showInitialLoader = isLoading && currentData.results.length === 0;

	useEffect(() => {
		let isMounted = true;
		const category = activeCategory;
		const categoryConfig = CATEGORY_CONFIG[category];
		const page = pageByCategory[category];

		setLoadingByCategory(prev => ({...prev, [category]: true}));

		http.get(categoryConfig.url, {page, page_size: PAGE_SIZE})
			.then((response: IApiResponse) => {
				if (!isMounted) {
					return;
				}
				setDataByCategory(prev => ({
					...prev,
					[category]: {
						results: Array.isArray(response?.results) ? response.results : [],
						count: Number(response?.count || 0),
						page: Number(response?.page || page),
						page_size: Number(response?.page_size || PAGE_SIZE),
					},
				}));
			})
			.catch(() => {
				if (!isMounted) {
					return;
				}
				setDataByCategory(prev => ({
					...prev,
					[category]: {results: [], count: 0, page, page_size: PAGE_SIZE},
				}));
			})
			.finally(() => {
				if (!isMounted) {
					return;
				}
				setLoadingByCategory(prev => ({...prev, [category]: false}));
			});

		return () => {
			isMounted = false;
		};
	}, [activeCategory, pageByCategory, http]);

	return (
		<div className={bem.block()}>
			<div className={bem.element('header')}>
				<div>
					<h1 className={bem.element('title')}>Выбор пользователей Interests</h1>
					<p className={bem.element('subtitle')}>
						Полные рейтинги Interests по формуле IMDb. При равенстве учитывается Metascore / TMDB score.
					</p>
				</div>
			</div>

			<CategoriesTab
				className={bem.element('tabs')}
				categories={CATEGORIES}
				activeCategory={activeCategory}
				onChangeCategory={(category: string) => setActiveCategory(category as TCategory)}
			>
				<div className={bem.element('panel')}>
					<LoadingOverlay active={showInitialLoader} spinner text='Загружаем топ...'>
						<div className={bem.element('list')}>
							{currentData.results.map((item, index) => {
								const rank = (currentPage - 1) * PAGE_SIZE + index + 1;
								const mappedItem: ITmdbMediaCardItem = {
									id: item.id,
									name: item.name,
									poster_path: item.poster_path,
									backdrop_path: item.backdrop_path,
									release_date: item.release_date,
									overview: item.overview,
									genres: item.genres,
									platforms: item.platforms,
									tags: item.tags,
									user_status: item.user_status,
									vote_average: item.average_user_score,
									vote_count: item.ratings_count,
								};
								const itemType = CATEGORY_CONFIG[activeCategory].itemType;

								return (
									<div
										className={bem.element('row', {
											top1: rank === 1,
											top2: rank === 2,
											top3: rank === 3,
										})}
										key={`${activeCategory}-${item.id}-${rank}`}
									>
										<div className={bem.element('rank', {
											top1: rank === 1,
											top2: rank === 2,
											top3: rank === 3,
										})}>{rank}</div>
										<div className={bem.element('row-main')}>
											<TmdbMediaCard
												item={mappedItem}
												itemType={itemType}
												className={bem.element('card')}
											/>
											<div className={bem.element('points', {
												top1: rank === 1,
												top2: rank === 2,
												top3: rank === 3,
											})}>
												<div className={bem.element('points-main')}>
													{typeof item.weighted_score === 'number' ? item.weighted_score.toFixed(2) : '0.00'}
												</div>
												<div className={bem.element('points-meta')}>
													{item.ratings_count || 0} {pluralizeRu(item.ratings_count || 0, 'оценка', 'оценки', 'оценок')}
												</div>
												{typeof item.platform_score === 'number' && item.platform_score >= 0 && (
													<div className={bem.element('points-meta')}>
														{itemType === 'game' ? 'Metascore' : 'TMDB'}: {item.platform_score}
													</div>
												)}
												{(() => {
													const statusBadge = getUserStatusBadge(itemType, item.user_status);
													return statusBadge ? (
														<div className={bem.element('points-status', {[statusBadge.tone]: true})}>
															{statusBadge.label}
														</div>
													) : null;
												})()}
											</div>
										</div>
									</div>
								);
							})}
							{!isLoading && currentData.results.length === 0 && (
								<div className={bem.element('empty')}>Пока недостаточно оценок для этого рейтинга</div>
							)}
						</div>
					</LoadingOverlay>

					{currentData.count > PAGE_SIZE && (
						<Pagination
							showSteps
							aroundCount={2}
							list={{
								total: currentData.count,
								page: currentPage,
								pageSize: PAGE_SIZE,
							}}
							onChange={page => {
								setPageByCategory(prev => ({...prev, [activeCategory]: page}));
							}}
						/>
					)}
				</div>
			</CategoriesTab>
		</div>
	);
}

export default CommunityPicksPage;
