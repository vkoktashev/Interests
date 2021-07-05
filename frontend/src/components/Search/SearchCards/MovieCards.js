import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock/SearchCardsBlock";

function MovieCards({ movies, hidden }) {
	const objects = useMemo(
		() =>
			movies?.reduce((newObjects, movie) => {
				let object = {
					name: movie.title,
					id: movie.id,
					poster: `url(${"http://image.tmdb.org/t/p/w300" + movie.backdrop_path})`,
					link: "/movie/" + movie.id,
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
