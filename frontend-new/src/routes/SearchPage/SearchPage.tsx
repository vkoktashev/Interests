import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import {Form, InputField} from '@steroidsjs/core/ui/form';
import Pagination from '@steroidsjs/core/ui/list/Pagination/Pagination';
import {formChange} from '@steroidsjs/core/actions/form';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {push, replace} from 'connected-react-router';
import CategoriesTab from '../../shared/CategoriesTab';
import GameCards from './views/GameCards';
import MovieCards from './views/MovieCards';
import PersonCards from './views/PersonCards';
import ShowCards from './views/ShowCards';
import UserCards from './views/UserCards';
import {
	IGameSearchItem,
	IPersonSearchItem,
	IPersonSearchResponse,
	ITmdbMediaItem,
	ITmdbSearchResponse,
	IUserSearchItem,
	SEARCH_CATEGORIES,
	TSearchCategory,
} from './views/searchTypes';
import './search-page.scss';

const PAGE_SIZE = 12;
const SEARCH_PAGE_FORM = 'search_page_form';

interface ISearchFormValues {
	query: string;
	page: number;
	activeCategory: TSearchCategory;
}

interface ISearchResultsState {
	Игры: IGameSearchItem[];
	Фильмы: ITmdbMediaItem[];
	Сериалы: ITmdbMediaItem[];
	Люди: IPersonSearchItem[];
	Пользователи: IUserSearchItem[];
}

function getInitialResults(): ISearchResultsState {
	return {
		Игры: [],
		Фильмы: [],
		Сериалы: [],
		Люди: [],
		Пользователи: [],
	};
}

function getInitialTotals(): Record<TSearchCategory, number> {
	return {
		Игры: 0,
		Фильмы: 0,
		Сериалы: 0,
		Люди: 0,
		Пользователи: 0,
	};
}

const INITIAL_FORM_VALUES: ISearchFormValues = {
	query: '',
	page: 1,
	activeCategory: SEARCH_CATEGORIES[0],
};


const CATEGORY_SLUGS: Record<TSearchCategory, string> = {
	Игры: 'games',
	Фильмы: 'movies',
	Сериалы: 'shows',
	Люди: 'people',
	Пользователи: 'users',
};

const CATEGORY_BY_SLUG = SEARCH_CATEGORIES.reduce((acc, category) => {
	acc[CATEGORY_SLUGS[category]] = category;
	return acc;
}, {} as Record<string, TSearchCategory>);

const CATEGORY_LOADING_TEXT: Record<TSearchCategory, string> = {
	Игры: 'Ищем игры...',
	Фильмы: 'Ищем фильмы...',
	Сериалы: 'Ищем сериалы...',
	Люди: 'Ищем людей...',
	Пользователи: 'Ищем пользователей...',
};

function normalizeQuery(value: unknown): string {
	if (!value) {
		return '';
	}
	return String(value).trim();
}

function decodeQueryParam(value: unknown): string {
	if (!value) {
		return '';
	}
	const rawValue = String(value).replace(/\+/g, ' ');
	try {
		return decodeURIComponent(rawValue);
	} catch {
		return rawValue;
	}
}

function getCategory(value: unknown): TSearchCategory {
	if (SEARCH_CATEGORIES.includes(value as TSearchCategory)) {
		return value as TSearchCategory;
	}
	return SEARCH_CATEGORIES[0];
}

function getCategoryBySlug(value: unknown): TSearchCategory {
	const normalizedValue = normalizeQuery(value).toLowerCase();
	return CATEGORY_BY_SLUG[normalizedValue] || getCategory(value);
}

function getPage(value: unknown): number {
	const page = Math.floor(Number(value));
	if (!isFinite(page) || page < 1) {
		return 1;
	}
	return page;
}

function buildSearchUrl(values: ISearchFormValues): string {
	const params = new URLSearchParams();
	const query = normalizeQuery(values.query);
	const activeCategory = getCategory(values.activeCategory);
	const page = getPage(values.page);

	if (query) {
		params.set('query', query);
	}
	if (query || activeCategory !== SEARCH_CATEGORIES[0]) {
		params.set('category', CATEGORY_SLUGS[activeCategory]);
	}
	if (query && page > 1) {
		params.set('page', String(page));
	}

	const queryString = params.toString();
	return queryString ? `/search?${queryString}` : '/search';
}

function resolveTotalWithoutMeta(itemsLength: number, page: number): number {
	if (itemsLength < PAGE_SIZE) {
		return (page - 1) * PAGE_SIZE + itemsLength;
	}
	return page * PAGE_SIZE + 1;
}

function SearchPage() {
	const dispatch = useDispatch();
	const {http} = useComponents();

	const routeParams = useSelector(getRouteParams) || {};
	const queryFromRoute = normalizeQuery(decodeQueryParam(routeParams.query));
	const activeCategory = getCategoryBySlug(routeParams.category);
	const currentPage = getPage(routeParams.page);
	const normalizedQuery = queryFromRoute;

	const [isLoading, setLoading] = useState(false);
	const [results, setResults] = useState<ISearchResultsState>(getInitialResults());
	const [totals, setTotals] = useState<Record<TSearchCategory, number>>(getInitialTotals());
	const requestIdRef = useRef(0);

	const clearResults = useCallback(() => {
		setResults(getInitialResults());
		setTotals(getInitialTotals());
	}, []);

	const updateCategoryResults = useCallback(
		<T extends TSearchCategory>(category: T, items: ISearchResultsState[T], total: number, requestId: number) => {
			if (requestId !== requestIdRef.current) {
				return;
			}
			setResults(prev => ({
				...prev,
				[category]: items,
			}));
			setTotals(prev => ({
				...prev,
				[category]: total,
			}));
		},
		[]
	);

	const searchGames = useCallback(async (query: string, page: number, requestId: number) => {
		const response = await http.get('/games/search/igdb/', {
			query,
			page,
			page_size: PAGE_SIZE,
		});
		const items = (Array.isArray(response) ? response : []) as IGameSearchItem[];
		updateCategoryResults('Игры', items, resolveTotalWithoutMeta(items.length, page), requestId);
	}, [http, updateCategoryResults]);

	const searchMovies = useCallback(async (query: string, page: number, requestId: number) => {
		const response = (await http.get('/movies/search/tmdb/', {
			query,
			page,
			page_size: PAGE_SIZE,
		})) as ITmdbSearchResponse;
		const items = Array.isArray(response?.results) ? response.results : [];
		const total = Number(response?.total_results) || resolveTotalWithoutMeta(items.length, page);
		updateCategoryResults('Фильмы', items, total, requestId);
	}, [http, updateCategoryResults]);

	const searchShows = useCallback(async (query: string, page: number, requestId: number) => {
		const response = (await http.get('/shows/search/tmdb/', {
			query,
			page,
			page_size: PAGE_SIZE,
		})) as ITmdbSearchResponse;
		const items = Array.isArray(response?.results) ? response.results : [];
		const total = Number(response?.total_results) || resolveTotalWithoutMeta(items.length, page);
		updateCategoryResults('Сериалы', items, total, requestId);
	}, [http, updateCategoryResults]);

	const searchPeople = useCallback(async (query: string, page: number, requestId: number) => {
		const response = (await http.get('/people/search/tmdb/', {
			query,
			page,
			page_size: PAGE_SIZE,
		})) as IPersonSearchResponse;
		const items = Array.isArray(response?.results) ? response.results : [];
		const total = Number(response?.total_results) || resolveTotalWithoutMeta(items.length, page);
		updateCategoryResults('Люди', items, total, requestId);
	}, [http, updateCategoryResults]);

	const searchUsers = useCallback(async (query: string, page: number, requestId: number) => {
		const response = await http.get('/users/search/', {
			query,
			page,
			page_size: PAGE_SIZE,
		});
		const items = (Array.isArray(response) ? response : []) as IUserSearchItem[];
		updateCategoryResults('Пользователи', items, resolveTotalWithoutMeta(items.length, page), requestId);
	}, [http, updateCategoryResults]);

	const runSearch = useCallback(async (values: ISearchFormValues) => {
		const nextQuery = normalizeQuery(values.query);
		const nextPage = getPage(values.page);
		const nextCategory = getCategory(values.activeCategory);

		if (!nextQuery) {
			requestIdRef.current += 1;
			clearResults();
			setLoading(false);
			return;
		}

		const requestId = ++requestIdRef.current;
		setLoading(true);

		try {
			if (nextCategory === 'Игры') {
				await searchGames(nextQuery, nextPage, requestId);
			}
			if (nextCategory === 'Фильмы') {
				await searchMovies(nextQuery, nextPage, requestId);
			}
			if (nextCategory === 'Сериалы') {
				await searchShows(nextQuery, nextPage, requestId);
			}
			if (nextCategory === 'Люди') {
				await searchPeople(nextQuery, nextPage, requestId);
			}
			if (nextCategory === 'Пользователи') {
				await searchUsers(nextQuery, nextPage, requestId);
			}
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [clearResults, searchGames, searchMovies, searchPeople, searchShows, searchUsers]);

	const navigateToSearch = useCallback((values: ISearchFormValues, isReplace = false) => {
		const action = isReplace ? replace : push;
		dispatch(action(buildSearchUrl(values)));
	}, [dispatch]);

	const submitSearch = useCallback((values: ISearchFormValues) => {
		navigateToSearch({
			query: values.query,
			activeCategory: getCategory(values.activeCategory),
			page: 1,
		});
	}, [navigateToSearch]);

	useEffect(() => {
		dispatch(formChange(SEARCH_PAGE_FORM, {
			query: queryFromRoute,
			page: currentPage,
			activeCategory,
		}));
	}, [activeCategory, currentPage, dispatch, queryFromRoute]);

	useEffect(() => {
		runSearch({
			query: queryFromRoute,
			page: currentPage,
			activeCategory,
		});
	}, [activeCategory, currentPage, queryFromRoute, runSearch]);

	const content = useMemo(() => {
		if (!normalizedQuery) {
			return (
				<div className='search-page__empty-state'>
					Введите запрос, чтобы начать поиск
				</div>
			);
		}

		if (activeCategory === 'Игры') {
			return <GameCards games={results['Игры']} />;
		}
		if (activeCategory === 'Фильмы') {
			return <MovieCards movies={results['Фильмы']} />;
		}
		if (activeCategory === 'Сериалы') {
			return <ShowCards shows={results['Сериалы']} />;
		}
		if (activeCategory === 'Люди') {
			return <PersonCards people={results['Люди']} />;
		}
		return <UserCards users={results['Пользователи']} />;
	}, [activeCategory, normalizedQuery, results]);

	const totalForActiveCategory = totals[activeCategory] || 0;
	const showPagination = normalizedQuery.length > 0 && totalForActiveCategory > PAGE_SIZE;

	return (
		<div className='search-page'>
			<div className='search-page__body'>
				<Form
					formId={SEARCH_PAGE_FORM}
					className='search-page__form'
					initialValues={{
						...INITIAL_FORM_VALUES,
						query: queryFromRoute,
						page: currentPage,
						activeCategory,
					}}
					onSubmit={submitSearch}
					useRedux
				>
					<div className='search-page__form-head'>
						<div>
							<h1 className='search-page__title'>Поиск</h1>
							<p className='search-page__subtitle'>Найдите игры, фильмы, сериалы, людей и пользователей</p>
						</div>
					</div>
					<div className='search-page__input-wrap'>
						<InputField
							attribute='query'
							label={__('Что ищем')}
						/>
					</div>
				</Form>

				<CategoriesTab
					className='search-page__tabs'
					categories={[...SEARCH_CATEGORIES]}
					activeCategory={activeCategory}
					onChangeCategory={(category: string) => {
						const normalizedCategory = getCategory(category);
						navigateToSearch({
							query: queryFromRoute,
							activeCategory: normalizedCategory,
							page: 1,
						}, true);
					}}
				>
					<div className='search-page__results'>
						<LoadingOverlay
							active={isLoading}
							spinner
							text={CATEGORY_LOADING_TEXT[activeCategory]}
						>
							{content}
						</LoadingOverlay>

						{showPagination && (
							<Pagination
								showSteps
								aroundCount={2}
								list={{
									total: totalForActiveCategory,
									page: currentPage,
									pageSize: PAGE_SIZE,
								}}
								onChange={page => {
									navigateToSearch({
										query: queryFromRoute,
										activeCategory,
										page,
									}, true);
								}}
							/>
						)}
					</div>
				</CategoriesTab>
			</div>
		</div>
	);
}

export default SearchPage;
