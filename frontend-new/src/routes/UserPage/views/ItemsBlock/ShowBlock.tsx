import React from "react";
import ItemBlock from "./ItemBlock";

function ShowBlock({ shows }) {
	return (
		<ItemBlock
			formId='showsBlock'
			items={shows?.map((show) => {
				const watchedEpisodes = Number(show.watched_episodes_count || 0);
				const totalEpisodes = Number(show.show.tmdb_number_of_episodes || 0);

				return {
					key: String(show.show.tmdb_id),
					link: window.location.origin + "/show/" + show.show.tmdb_id,
					name: show.show.tmdb_name,
					status: show.status,
					score: show.score,
					review: show.review,
					poster: show.show.tmdb_backdrop_path,
					spent_time: show.spent_time,
					progress: `${watchedEpisodes}/${totalEpisodes > 0 ? totalEpisodes : '?'}`,
				};
			})}
			statuses={[
				{ id: "Буду смотреть", label: "Буду смотреть" },
				{ id: "Смотрю", label: "Смотрю" },
				{ id: "Дропнул", label: "Дропнул" },
				{ id: "Посмотрел", label: "Посмотрел" },
			]}
			fields={[
				{ label: "Ссылка", key: "link" },
				{ label: "Название", key: "name" },
				{ label: "Статус", key: "status" },
				{ label: "Оценка", key: "score" },
				{ label: "Прогресс", key: "progress" },
				{ label: "Отзыв", key: "review" },
				{ label: "Время просмотра", key: "spent_time" },
				{ label: "Картинка", key: "poster" },
			]}
			name={"Сериалы"}
		/>
	);
}

export default ShowBlock;
