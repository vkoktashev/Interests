import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../index';

export const SEARCH_CATEGORIES = ['Игры', 'Фильмы', 'Сериалы', 'Пользователи'] as const;

export type TSearchCategory = (typeof SEARCH_CATEGORIES)[number];

export interface ISearchCardData {
	id: string | number;
	name: string;
	poster?: string;
	releaseDate?: string;
	genres?: string;
	tags?: string;
	platforms?: string;
	overview?: string;
	layoutVariant?: 'default' | 'media';
	route: typeof ROUTE_GAME | typeof ROUTE_MOVIE | typeof ROUTE_SHOW;
	routeParams: Record<string, unknown>;
}

export interface IRawgGame {
	id: number;
	name: string;
	slug: string;
	background_image?: string;
	released?: string;
	genres?: Array<{name: string}>;
	tags?: Array<{name: string}>;
	platforms?: Array<{platform: {name: string}}>;
}

export interface ITmdbMediaItem {
	id: number;
	title?: string;
	name?: string;
	poster_path?: string;
	backdrop_path?: string;
	overview?: string;
	release_date?: string;
	first_air_date?: string;
}

export interface ITmdbSearchResponse {
	results?: ITmdbMediaItem[];
	total_results?: number;
}

export interface IUserSearchItem {
	id: number;
	username: string;
	avatar?: string;
	image?: string;
}
