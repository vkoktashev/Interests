import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../index';
import {IRawgGame, ISearchCardData, ITmdbMediaItem} from './searchTypes';

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

export function mapGameToCard(game: IRawgGame): ISearchCardData {
	return {
		id: game.id,
		name: game.name,
		poster: game.background_image ? `url(${game.background_image})` : undefined,
		layoutVariant: 'media',
		releaseDate: formatDate(game.released),
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
