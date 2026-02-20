import React, {useMemo} from 'react';
import SearchCardsBlock from './SearchCardsBlock';
import {mapMovieToCard} from './searchMappers';
import {ITmdbMediaItem} from './searchTypes';

interface IMovieCardsProps {
	movies: ITmdbMediaItem[];
	hidden?: boolean;
}

function MovieCards({movies, hidden}: IMovieCardsProps) {
	const objects = useMemo(() => movies.map(mapMovieToCard), [movies]);

	return (
		<SearchCardsBlock
			hidden={hidden}
			objects={objects}
			emptyText='Фильмы не найдены'
		/>
	);
}

export default MovieCards;
