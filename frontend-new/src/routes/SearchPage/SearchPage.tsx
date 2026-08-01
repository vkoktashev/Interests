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
import GameFilters from './GameFilters';
import {
	DEFAULT_GAME_TYPE_IDS,
	DEFAULT_PLATFORM_IDS,
	GAME_TYPE_OPTIONS,
	IGamePlatform,
	IGameSearchItem,
	IGameSearchResponse,
	IPersonSearchItem,
	IPersonSearchResponse,
	ITmdbMediaItem,
	ITmdbSearchResponse,
	IUserSearchItem,
	POPULAR_PLATFORM_IDS,
	SEARCH_CATEGORIES,
	TGameTypeId,
	TSearchCategory,
} from './views/searchTypes';
import './search-page.scss';

const PAGE_SIZE = 12;
const SEARCH_PAGE_FORM = 'search_page_form';
const GAME_TYPES_STORAGE_KEY = 'search.gameTypes';
const PLATFORMS_STORAGE_KEY = 'search.platforms';

interface ISearchFormValues {
	query: string;
	page: number;
	activeCategory: TSearchCategory;
	gameTypes: number[];
	platformIds: number[];
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
	gameTypes: [...DEFAULT_GAME_TYPE_IDS],
	platformIds: [...DEFAULT_PLATFORM_IDS],
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

function normalizeGameTypes(values: number[]): number[] {
	const selectedTypeIds = new Set(values);
	return GAME_TYPE_OPTIONS
		.map(gameType => gameType.id)
		.filter(gameTypeId => selectedTypeIds.has(gameTypeId));
}

function parseGameTypes(value: string): number[] | null {
	const normalizedValue = decodeQueryParam(value);
	if (normalizedValue === 'none') {
		return [];
	}

	const gameTypeIds = normalizedValue.split(',').map(gameTypeId => Number(gameTypeId));
	const availableGameTypeIds = new Set<number>(GAME_TYPE_OPTIONS.map(gameType => gameType.id));
	if (
		gameTypeIds.length === 0
		|| gameTypeIds.some(gameTypeId => !Number.isInteger(gameTypeId) || !availableGameTypeIds.has(gameTypeId))
	) {
		return null;
	}

	return normalizeGameTypes(gameTypeIds);
}

function areDefaultGameTypes(gameTypes: number[]): boolean {
	return gameTypes.length === DEFAULT_GAME_TYPE_IDS.length
		&& gameTypes.every((gameTypeId, index) => gameTypeId === DEFAULT_GAME_TYPE_IDS[index]);
}

function getSavedGameTypes(): number[] | null {
	if (typeof window === 'undefined') {
		return null;
	}

	let savedValue: string | null;
	try {
		savedValue = window.localStorage.getItem(GAME_TYPES_STORAGE_KEY);
	} catch {
		return null;
	}
	if (savedValue === null) {
		return null;
	}

	const gameTypes = parseGameTypes(savedValue);
	if (gameTypes === null) {
		try {
			window.localStorage.removeItem(GAME_TYPES_STORAGE_KEY);
		} catch {
			return null;
		}
	}
	return gameTypes;
}

function saveGameTypes(gameTypes: number[]) {
	if (typeof window === 'undefined') {
		return;
	}

	const normalizedGameTypes = normalizeGameTypes(gameTypes);
	try {
		if (areDefaultGameTypes(normalizedGameTypes)) {
			window.localStorage.removeItem(GAME_TYPES_STORAGE_KEY);
		} else {
			window.localStorage.setItem(
				GAME_TYPES_STORAGE_KEY,
				normalizedGameTypes.length > 0 ? normalizedGameTypes.join(',') : 'none'
			);
		}
	} catch {
		return;
	}
}

function getGameTypes(value: unknown): number[] {
	if (value === undefined || value === null || value === '') {
		return getSavedGameTypes() ?? [...DEFAULT_GAME_TYPE_IDS];
	}

	return parseGameTypes(String(value)) ?? [...DEFAULT_GAME_TYPE_IDS];
}

function normalizePlatformIds(values: number[]): number[] {
	return Array.from(new Set(values.map(Number).filter(value => Number.isInteger(value) && value > 0)))
		.sort((firstId, secondId) => firstId - secondId);
}

function parsePlatformIds(value: string): number[] | null {
	const normalizedValue = decodeQueryParam(value);
	if (normalizedValue === 'none') {
		return [];
	}

	const platformIds = normalizedValue.split(',').map(platformId => Number(platformId));
	if (
		platformIds.length === 0
		|| platformIds.some(platformId => !Number.isInteger(platformId) || platformId <= 0)
	) {
		return null;
	}

	return normalizePlatformIds(platformIds);
}

function areDefaultPlatformIds(platformIds: number[]): boolean {
	return platformIds.length === DEFAULT_PLATFORM_IDS.length
		&& platformIds.every((platformId, index) => platformId === DEFAULT_PLATFORM_IDS[index]);
}

function getSavedPlatformIds(): number[] | null {
	if (typeof window === 'undefined') {
		return null;
	}

	let savedValue: string | null;
	try {
		savedValue = window.localStorage.getItem(PLATFORMS_STORAGE_KEY);
	} catch {
		return null;
	}
	if (savedValue === null) {
		return null;
	}

	const platformIds = parsePlatformIds(savedValue);
	if (platformIds === null) {
		try {
			window.localStorage.removeItem(PLATFORMS_STORAGE_KEY);
		} catch {
			return null;
		}
	}
	return platformIds;
}

function savePlatformIds(platformIds: number[]) {
	if (typeof window === 'undefined') {
		return;
	}

	const normalizedPlatformIds = normalizePlatformIds(platformIds);
	try {
		if (areDefaultPlatformIds(normalizedPlatformIds)) {
			window.localStorage.removeItem(PLATFORMS_STORAGE_KEY);
		} else {
			window.localStorage.setItem(
				PLATFORMS_STORAGE_KEY,
				normalizedPlatformIds.length > 0 ? normalizedPlatformIds.join(',') : 'none'
			);
		}
	} catch {
		return;
	}
}

function getPlatformIds(value: unknown): number[] {
	if (value === undefined || value === null || value === '') {
		return getSavedPlatformIds() ?? [...DEFAULT_PLATFORM_IDS];
	}

	return parsePlatformIds(String(value)) ?? [...DEFAULT_PLATFORM_IDS];
}

function buildSearchUrl(values: ISearchFormValues): string {
	const params = new URLSearchParams();
	const query = normalizeQuery(values.query);
	const activeCategory = getCategory(values.activeCategory);
	const page = getPage(values.page);
	const gameTypes = normalizeGameTypes(values.gameTypes);
	const platformIds = normalizePlatformIds(values.platformIds);

	if (query) {
		params.set('query', query);
	}
	if (query || activeCategory !== SEARCH_CATEGORIES[0]) {
		params.set('category', CATEGORY_SLUGS[activeCategory]);
	}
	if (query && page > 1) {
		params.set('page', String(page));
	}
	if (!areDefaultGameTypes(gameTypes)) {
		params.set('game_types', gameTypes.length > 0 ? gameTypes.join(',') : 'none');
	}
	if (!areDefaultPlatformIds(platformIds)) {
		params.set('platforms', platformIds.length > 0 ? platformIds.join(',') : 'none');
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

function resolveTotalWithHasNext(itemsLength: number, page: number, hasNext: boolean): number {
	return (page - 1) * PAGE_SIZE + itemsLength + (hasNext ? 1 : 0);
}

function SearchPage() {
	const dispatch = useDispatch();
	const {http} = useComponents();

	const routeParams = useSelector(getRouteParams) || {};
	const queryFromRoute = normalizeQuery(decodeQueryParam(routeParams.query));
	const activeCategory = getCategoryBySlug(routeParams.category);
	const currentPage = getPage(routeParams.page);
	const selectedGameTypes = useMemo(() => getGameTypes(routeParams.game_types), [routeParams.game_types]);
	const selectedPlatformIds = useMemo(() => getPlatformIds(routeParams.platforms), [routeParams.platforms]);
	const normalizedQuery = queryFromRoute;

	const [isLoading, setLoading] = useState(false);
	const [platforms, setPlatforms] = useState<IGamePlatform[]>([
		{id: DEFAULT_PLATFORM_IDS[0], name: 'PC'},
	]);
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

	const searchGames = useCallback(async (
		query: string,
		page: number,
		gameTypes: number[],
		platformIds: number[],
		requestId: number
	) => {
		const response = (await http.get('/games/search/igdb/', {
			query,
			page,
			page_size: PAGE_SIZE,
			game_types: gameTypes.length > 0 ? gameTypes.join(',') : 'none',
			platforms: platformIds.length > 0 ? platformIds.join(',') : 'none',
		})) as IGameSearchResponse;
		const items = Array.isArray(response?.results) ? response.results : [];
		const total = resolveTotalWithHasNext(items.length, page, Boolean(response?.has_next));
		updateCategoryResults('Игры', items, total, requestId);
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

	useEffect(() => {
		let isActive = true;

		const loadPlatforms = async () => {
			try {
				const response = await http.get('/games/search/platforms/');
				if (!isActive || !Array.isArray(response)) {
					return;
				}

				const platformsById = new Map<number, IGamePlatform>();
				(response as IGamePlatform[]).forEach(platform => {
					if (Number.isInteger(platform?.id) && platform.id > 0 && platform.name) {
						platformsById.set(platform.id, platform);
					}
				});
				if (!platformsById.has(DEFAULT_PLATFORM_IDS[0])) {
					platformsById.set(DEFAULT_PLATFORM_IDS[0], {id: DEFAULT_PLATFORM_IDS[0], name: 'PC'});
				}

				setPlatforms(Array.from(platformsById.values()).sort((firstPlatform, secondPlatform) => {
					const firstPriority = POPULAR_PLATFORM_IDS.indexOf(firstPlatform.id);
					const secondPriority = POPULAR_PLATFORM_IDS.indexOf(secondPlatform.id);
					if (firstPriority >= 0 && secondPriority >= 0) {
						return firstPriority - secondPriority;
					}
					if (firstPriority >= 0) {
						return -1;
					}
					if (secondPriority >= 0) {
						return 1;
					}
					return firstPlatform.name.localeCompare(secondPlatform.name);
				}));
			} catch {
				return;
			}
		};

		void loadPlatforms();
		return () => {
			isActive = false;
		};
	}, [http]);

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
				await searchGames(nextQuery, nextPage, values.gameTypes, values.platformIds, requestId);
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

	const submitQuery = useCallback((query: string) => {
		navigateToSearch({
			query,
			activeCategory,
			page: 1,
			gameTypes: selectedGameTypes,
			platformIds: selectedPlatformIds,
		});
	}, [activeCategory, navigateToSearch, selectedGameTypes, selectedPlatformIds]);

	const submitSearch = useCallback((values: ISearchFormValues) => {
		submitQuery(values.query);
	}, [submitQuery]);

	const submitSearchOnEnter = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
			event.preventDefault();
			submitQuery(event.currentTarget.value);
		}
	}, [submitQuery]);

	const changeGameType = useCallback((gameTypeId: TGameTypeId, isSelected: boolean) => {
		const nextGameTypes = isSelected
			? normalizeGameTypes([...selectedGameTypes, gameTypeId])
			: selectedGameTypes.filter(selectedGameTypeId => selectedGameTypeId !== gameTypeId);

		saveGameTypes(nextGameTypes);
		navigateToSearch({
			query: queryFromRoute,
			activeCategory,
			page: 1,
			gameTypes: nextGameTypes,
			platformIds: selectedPlatformIds,
		}, true);
	}, [activeCategory, navigateToSearch, queryFromRoute, selectedGameTypes, selectedPlatformIds]);

	const changePlatforms = useCallback((platformIds: number[]) => {
		const nextPlatformIds = normalizePlatformIds(platformIds);
		if (
			nextPlatformIds.length === selectedPlatformIds.length
			&& nextPlatformIds.every((platformId, index) => platformId === selectedPlatformIds[index])
		) {
			return;
		}

		savePlatformIds(nextPlatformIds);
		navigateToSearch({
			query: queryFromRoute,
			activeCategory,
			page: 1,
			gameTypes: selectedGameTypes,
			platformIds: nextPlatformIds,
		}, true);
	}, [activeCategory, navigateToSearch, queryFromRoute, selectedGameTypes, selectedPlatformIds]);

	useEffect(() => {
		dispatch(formChange(SEARCH_PAGE_FORM, {
			query: queryFromRoute,
			page: currentPage,
			activeCategory,
			gameTypes: selectedGameTypes,
			platformIds: selectedPlatformIds,
		}));
	}, [activeCategory, currentPage, dispatch, queryFromRoute, selectedGameTypes, selectedPlatformIds]);

	useEffect(() => {
		runSearch({
			query: queryFromRoute,
			page: currentPage,
			activeCategory,
			gameTypes: selectedGameTypes,
			platformIds: selectedPlatformIds,
		});
	}, [activeCategory, currentPage, queryFromRoute, runSearch, selectedGameTypes, selectedPlatformIds]);

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
						gameTypes: selectedGameTypes,
						platformIds: selectedPlatformIds,
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
							inputProps={{onKeyDown: submitSearchOnEnter}}
							label={__('Что ищем')}
						/>
					</div>
					{activeCategory === 'Игры' && (
						<GameFilters
							platforms={platforms}
							selectedPlatformIds={selectedPlatformIds}
							selectedTypeIds={selectedGameTypes}
							onPlatformChange={changePlatforms}
							onTypeChange={changeGameType}
						/>
					)}
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
							gameTypes: selectedGameTypes,
							platformIds: selectedPlatformIds,
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
										gameTypes: selectedGameTypes,
										platformIds: selectedPlatformIds,
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
