import React from "react";
import ItemBlock from "./ItemsBlock/ItemBlock";

function ShowBlock({ shows }) {
	return (
		<ItemBlock
			items={shows?.map((show) => {
				return {
					link: window.location.origin + "/show/" + show.show.tmdb_id,
					name: show.show.tmdb_name,
					status: show.status,
					score: show.score,
					review: show.review,
					poster: show.show.tmdb_backdrop_path,
					spent_time: show.spent_time,
				};
			})}
			statuses={["Буду смотреть", "Смотрю", "Дропнул", "Посмотрел"]}
			fields={[
				{ label: "Ссылка", key: "link" },
				{ label: "Название", key: "name" },
				{ label: "Статус", key: "status" },
				{ label: "Оценка", key: "score" },
				{ label: "Отзыв", key: "review" },
				{ label: "Время просмотра", key: "spent_time" },
				{ label: "Картинка", key: "poster" },
			]}
			name={"Сериалы"}
		/>
	);
}

export default ShowBlock;
