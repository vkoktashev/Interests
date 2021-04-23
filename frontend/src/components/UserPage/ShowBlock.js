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
			fields={["score", "spent_time"]}
		/>
	);
}

export default ShowBlock;
