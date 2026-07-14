import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_PERSON, ROUTE_SHOW} from '../../index';
import {GAME_TYPE_LABELS, IGameSearchItem, IPersonSearchItem, ISearchCardData, ITmdbMediaItem} from './searchTypes';

const DETAILS_LIMIT = 6;

export function formatDate(value?: string): string {
	if (!value || !value.includes('-')) {
		return '';
	}
	const [year, month, day] = value.split('-');
	if (!year || !month || !day) {
		return '';
	}
	return `${day}.${month}.${year}`;
}

export function joinNames<T>(items: T[] | undefined, getName: (item: T) => string, limit?: number): string {
	if (!items?.length) {
		return '';
	}
	const safeLimit = typeof limit === 'number' ? limit : items.length;
	return items
		.slice(0, safeLimit)
		.map(item => getName(item))
		.filter(Boolean)
		.join(', ');
}

export function mapGameToCard(game: IGameSearchItem): ISearchCardData {
	const gameType = game.game_type ?? game.category;

	return {
		id: game.id,
		name: game.name,
		kindLabel: typeof gameType === 'number' ? (GAME_TYPE_LABELS[gameType] || 'Игра') : undefined,
		poster: game.background_image ? `url(${game.background_image})` : undefined,
		layoutVariant: 'media',
		releaseDate: game.released_display || formatDate(game.released),
		genres: joinNames(game.genres, genre => genre.name),
		tags: joinNames(game.tags, tag => tag.name, DETAILS_LIMIT),
		platforms: joinNames(game.platforms, platform => platform.platform.name),
		route: ROUTE_GAME,
		routeParams: {
			gameId: game.slug,
		},
	};
}

export function mapMovieToCard(movie: ITmdbMediaItem): ISearchCardData {
	return {
		id: movie.id,
		name: movie.title || 'Без названия',
		poster: movie.poster_path || movie.backdrop_path,
		layoutVariant: 'media',
		releaseDate: formatDate(movie.release_date),
		overview: movie.overview || '',
		route: ROUTE_MOVIE,
		routeParams: {
			movieId: movie.id,
		},
	};
}

export function mapShowToCard(show: ITmdbMediaItem): ISearchCardData {
	return {
		id: show.id,
		name: show.name || 'Без названия',
		poster: show.poster_path || show.backdrop_path,
		layoutVariant: 'media',
		releaseDate: formatDate(show.first_air_date),
		overview: show.overview || '',
		route: ROUTE_SHOW,
		routeParams: {
			showId: show.id,
		},
	};
}

export function mapPersonToCard(person: IPersonSearchItem): ISearchCardData {
	return {
		id: person.id,
		name: person.name || 'Без имени',
		poster: person.profile_path,
		layoutVariant: 'media',
		kindLabel: person.known_for_department || 'Человек',
		overview: person.known_for_titles?.length ? `Известен по: ${person.known_for_titles.join(', ')}` : '',
		route: ROUTE_PERSON,
		routeParams: {
			personId: person.id,
		},
	};
}
