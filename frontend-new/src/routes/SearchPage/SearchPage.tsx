import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import {Form, InputField} from '@steroidsjs/core/ui/form';
import Pagination from '@steroidsjs/core/ui/list/Pagination/Pagination';
import {formChange, formSubmit} from '@steroidsjs/core/actions/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import CategoriesTab from '../../shared/CategoriesTab';
import GameCards from './views/GameCards';
import MovieCards from './views/MovieCards';
import ShowCards from './views/ShowCards';
import UserCards from './views/UserCards';
import {
	IRawgGame,
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
	Игры: IRawgGame[];
	Фильмы: ITmdbMediaItem[];
	Сериалы: ITmdbMediaItem[];
	Пользователи: IUserSearchItem[];
}

function getInitialResults(): ISearchResultsState {
	return {
		Игры: [],
		Фильмы: [],
		Сериалы: [],
		Пользователи: [],
	};
}

function getInitialTotals(): Record<TSearchCategory, number> {
	return {
		Игры: 0,
		Фильмы: 0,
		Сериалы: 0,
		Пользователи: 0,
	};
}

const INITIAL_FORM_VALUES: ISearchFormValues = {
	query: '',
	page: 1,
	activeCategory: SEARCH_CATEGORIES[0],
};


const CATEGORY_LOADING_TEXT: Record<TSearchCategory, string> = {
	Игры: 'Ищем игры...',
	Фильмы: 'Ищем фильмы...',
	Сериалы: 'Ищем сериалы...',
	Пользователи: 'Ищем пользователей...',
};

function normalizeQuery(value: unknown): string {
	if (!value) {
		return '';
	}
	return String(value).trim();
}

function getCategory(value: unknown): TSearchCategory {
	if (SEARCH_CATEGORIES.includes(value as TSearchCategory)) {
		return value as TSearchCategory;
	}
	return SEARCH_CATEGORIES[0];
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
	const formValues = useSelector(state => (getFormValues(state, SEARCH_PAGE_FORM) || INITIAL_FORM_VALUES) as ISearchFormValues);

	const rawQuery = useSelector(state => getRouteParams(state)?.query);
	const queryFromRoute = rawQuery ? decodeURIComponent(String(rawQuery)) : '';
	const activeCategory = getCategory(formValues.activeCategory);
	const currentPage = Number(formValues.page) || 1;
	const normalizedQuery = normalizeQuery(formValues.query);

	const [isLoading, setLoading] = useState(false);
	const [results, setResults] = useState<ISearchResultsState>(getInitialResults());
	const [totals, setTotals] = useState<Record<TSearchCategory, number>>(getInitialTotals());
	const lastQueryRef = useRef(normalizeQuery(queryFromRoute));
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
		const response = await http.get('/games/search/rawg/', {
			query,
			page,
			page_size: PAGE_SIZE,
		});
		const items = (Array.isArray(response) ? response : []) as IRawgGame[];
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
		const nextPage = Number(values.page) || 1;
		const nextCategory = getCategory(values.activeCategory);

		if (lastQueryRef.current !== nextQuery && nextPage !== 1) {
			dispatch(formChange(SEARCH_PAGE_FORM, 'page', 1));
			dispatch(formSubmit(SEARCH_PAGE_FORM));
			return;
		}

		if (!nextQuery) {
			lastQueryRef.current = '';
			clearResults();
			setLoading(false);
			return;
		}

		lastQueryRef.current = nextQuery;
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
			if (nextCategory === 'Пользователи') {
				await searchUsers(nextQuery, nextPage, requestId);
			}
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
			}
		}
	}, [clearResults, dispatch, searchGames, searchMovies, searchShows, searchUsers]);

	useEffect(() => {
		const normalizedRouteQuery = normalizeQuery(queryFromRoute);
		dispatch(formChange(SEARCH_PAGE_FORM, {
			query: normalizedRouteQuery,
			page: 1,
		}));

		if (normalizedRouteQuery) {
			dispatch(formSubmit(SEARCH_PAGE_FORM));
		} else {
			clearResults();
			setLoading(false);
		}
	}, [clearResults, dispatch, queryFromRoute]);

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
						query: normalizeQuery(queryFromRoute),
					}}
					onSubmit={runSearch}
					useRedux
				>
					<div className='search-page__form-head'>
						<div>
							<h1 className='search-page__title'>Поиск</h1>
							<p className='search-page__subtitle'>Найдите игры, фильмы, сериалы и пользователей</p>
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
						dispatch(formChange(SEARCH_PAGE_FORM, {
							activeCategory: normalizedCategory,
							page: 1,
						}));
						if (normalizeQuery(formValues.query)) {
							dispatch(formSubmit(SEARCH_PAGE_FORM));
						}
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
									dispatch(formChange(SEARCH_PAGE_FORM, 'page', page));
									dispatch(formSubmit(SEARCH_PAGE_FORM));
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
