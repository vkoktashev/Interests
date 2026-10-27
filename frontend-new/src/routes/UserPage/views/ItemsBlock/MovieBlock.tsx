import React from "react";
import ItemBlock from "./ItemBlock";

function MovieBlock({ movies }) {
	return (
		<ItemBlock
			formId='movieBlock'
			items={movies?.map((movie) => {
				return {
					key: String(movie.tmdb_id),
					link: window.location.origin + "/movie/" + movie.tmdb_id,
					name: movie.name,
					status: movie.status,
					score: movie.score,
					review: movie.review,
					poster: movie.poster,
				};
			})}
			statuses={[
				{ id: "Буду смотреть", label: "Буду смотреть" },
				{ id: "Дропнул", label: "Дропнул" },
				{ id: "Посмотрел", label: "Посмотрел" },
			]}
			fields={[
				{ label: "Ссылка", key: "link" },
				{ label: "Название", key: "name" },
				{ label: "Статус", key: "status" },
				{ label: "Оценка", key: "score" },
				{ label: "Отзыв", key: "review" },
				{ label: "Картинка", key: "poster" },
			]}
			name={"Фильмы"}
		/>
	);
}

export default MovieBlock;
