import type {TSearchCategory} from './searchTypes';

export const MEDIA_SEARCH_PATHS = {
	Фильмы: '/movies/search',
	Сериалы: '/shows/search',
};

export type TMediaSearchCategory = keyof typeof MEDIA_SEARCH_PATHS;

export function isMediaSearchCategory(category: TSearchCategory): category is TMediaSearchCategory {
	return category === 'Фильмы' || category === 'Сериалы';
}

export const ORIGINAL_LANGUAGES = [
	['en', 'Английский'],
	['ru', 'Русский'],
	['ja', 'Японский'],
	['ko', 'Корейский'],
	['zh', 'Китайский'],
	['fr', 'Французский'],
	['es', 'Испанский'],
	['de', 'Немецкий'],
	['it', 'Итальянский'],
	['tr', 'Турецкий'],
	['hi', 'Хинди'],
	['pt', 'Португальский'],
];

export const MIN_RATINGS = ['6', '7', '7.5', '8', '8.5', '9'];

export const MEDIA_SORT_OPTIONS = [
	['popular', 'По популярности'],
	['rating', 'По оценке (от 50 голосов)'],
	['newest', 'Сначала свежие премьеры'],
];

export interface IMediaSearchFilters {
	year: string;
	genre: string;
	original_language: string;
	min_rating: string;
	sort: string;
}

export const EMPTY_MEDIA_FILTERS: IMediaSearchFilters = {
	year: '',
	genre: '',
	original_language: '',
	min_rating: '',
	sort: 'popular',
};

export function readMediaFilters(params: Partial<Record<keyof IMediaSearchFilters, unknown>>): IMediaSearchFilters {
	const year = String(params.year ?? '');
	const genre = String(params.genre ?? '');
	const language = String(params.original_language ?? '');
	const rating = String(params.min_rating ?? '');
	const sort = String(params.sort ?? '');

	return {
		year: /^[1-9]\d{3}$/.test(year) ? year : '',
		genre: /^[1-9]\d{0,9}$/.test(genre) && Number(genre) <= 2147483647 ? genre : '',
		original_language: ORIGINAL_LANGUAGES.some(([code]) => code === language) ? language : '',
		min_rating: MIN_RATINGS.includes(rating) ? rating : '',
		sort: MEDIA_SORT_OPTIONS.some(([value]) => value === sort) ? sort : EMPTY_MEDIA_FILTERS.sort,
	};
}

export function getMediaFilterEntries(filters: IMediaSearchFilters, hasTitleQuery: boolean) {
	return Object.entries(filters).filter(([name, value]) =>
		value !== EMPTY_MEDIA_FILTERS[name as keyof IMediaSearchFilters]
		&& (!hasTitleQuery || name === 'year'));
}
