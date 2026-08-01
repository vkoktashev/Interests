import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_PERSON, ROUTE_SHOW} from '../../index';
import type {IMediaStatusBadge} from '../../../shared/mediaStatus';

export const SEARCH_CATEGORIES = ['Игры', 'Фильмы', 'Сериалы', 'Люди', 'Пользователи'] as const;

export const GAME_TYPE_OPTIONS = [
	{id: 0, label: 'Основная игра', selectedByDefault: true},
	{id: 2, label: 'Крупное дополнение', selectedByDefault: true},
	{id: 4, label: 'Самостоятельное дополнение', selectedByDefault: true},
	{id: 8, label: 'Ремейк', selectedByDefault: true},
	{id: 9, label: 'Ремастер', selectedByDefault: true},
	{id: 10, label: 'Расширенная версия', selectedByDefault: true},
	{id: 11, label: 'Порт', selectedByDefault: true},
	{id: 12, label: 'Fork', selectedByDefault: true},
	{id: 1, label: 'DLC', selectedByDefault: false},
	{id: 3, label: 'Сборник', selectedByDefault: false},
	{id: 5, label: 'Мод', selectedByDefault: false},
	{id: 6, label: 'Эпизод', selectedByDefault: false},
	{id: 7, label: 'Сезон', selectedByDefault: false},
	{id: 13, label: 'Набор', selectedByDefault: false},
	{id: 14, label: 'Обновление', selectedByDefault: false},
] as const;

export const DEFAULT_GAME_TYPE_IDS = GAME_TYPE_OPTIONS
	.filter(gameType => gameType.selectedByDefault)
	.map(gameType => gameType.id);

export const PC_PLATFORM_ID = 6;
export const DEFAULT_PLATFORM_IDS = [PC_PLATFORM_ID];
export const POPULAR_PLATFORM_IDS = [
	PC_PLATFORM_ID,
	167,
	169,
	508,
	130,
	48,
	49,
	34,
	39,
];

export const GAME_TYPE_LABELS = GAME_TYPE_OPTIONS.reduce<Record<number, string>>((labels, gameType) => {
	labels[gameType.id] = gameType.label;
	return labels;
}, {});

export type TSearchCategory = (typeof SEARCH_CATEGORIES)[number];
export type TGameTypeId = (typeof GAME_TYPE_OPTIONS)[number]['id'];

export interface ISearchCardData {
	id: string | number;
	name: string;
	kindLabel?: string;
	poster?: string;
	releaseDate?: string;
	genres?: string;
	tags?: string;
	platforms?: string;
	overview?: string;
	layoutVariant?: 'default' | 'media';
	statusBadge?: IMediaStatusBadge;
	route: typeof ROUTE_GAME | typeof ROUTE_MOVIE | typeof ROUTE_SHOW | typeof ROUTE_PERSON;
	routeParams: Record<string, unknown>;
}

export interface IGameSearchItem {
	id: number;
	name: string;
	slug: string;
	game_type?: number;
	category?: number;
	background_image?: string;
	released?: string;
	released_display?: string;
	genres?: Array<{name: string}>;
	tags?: Array<{name: string}>;
	platforms?: Array<{platform: {name: string}}>;
	user_status?: string | null;
}

export interface IGameSearchResponse {
	results?: IGameSearchItem[];
	has_next?: boolean;
}

export interface IGamePlatform {
	id: number;
	name: string;
	abbreviation?: string;
	slug?: string;
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
	user_status?: string | null;
}

export interface ITmdbSearchResponse {
	results?: ITmdbMediaItem[];
	total_results?: number;
}

export interface IPersonSearchItem {
	id: number;
	tmdb_id: number;
	name: string;
	profile_path?: string;
	known_for_department?: string;
	known_for_titles?: string[];
}

export interface IPersonSearchResponse {
	results?: IPersonSearchItem[];
	total_results?: number;
}

export interface IUserSearchItem {
	id: number;
	username: string;
	avatar?: string;
	image?: string;
}
