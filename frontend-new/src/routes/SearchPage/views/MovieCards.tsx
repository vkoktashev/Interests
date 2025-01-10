import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock";
import {ROUTE_MOVIE} from '../../index';

function MovieCards({ movies, hidden }) {
	const objects = useMemo(
		() =>
			movies?.reduce((newObjects, movie) => {
				let object: any = {
					name: movie.title,
					id: movie.id,
					poster: movie.backdrop_path,
					route: ROUTE_MOVIE,
					routeParams: {
						movieId: movie.id,
					},
					overview: movie.overview,
				};

				if (movie.release_date) {
					let mas = movie.release_date.split("-");
					let newDate = mas[2] + "." + mas[1] + "." + mas[0];
					object.release_date = newDate;
				} else object.release_date = "";

				if (object) newObjects.push(object);
				return newObjects;
			}, []),
		[movies]
	);

	return <SearchCardsBlock name='Фильмы' hidden={hidden} objects={objects} />;
}

export default MovieCards;
