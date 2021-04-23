import React from "react";
import ItemBlock from "./ItemsBlock/ItemBlock";

function MovieBlock({ movies }) {
	return (
		<ItemBlock
			items={movies?.map((movie) => {
				return {
					link: window.location.origin + "/movie/" + movie.movie.tmdb_id,
					name: movie.movie.tmdb_name,
					status: movie.status,
					score: movie.score,
					review: movie.review,
					poster: movie.movie.tmdb_backdrop_path,
				};
			})}
			statuses={["Буду смотреть", "Дропнул", "Посмотрел"]}
			fields={["score"]}
		/>
	);
}

export default MovieBlock;
