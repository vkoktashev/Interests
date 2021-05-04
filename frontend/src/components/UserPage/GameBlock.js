import React from "react";
import ItemBlock from "./ItemsBlock/ItemBlock";

function GameBlock({ games }) {
	return (
		<ItemBlock
			items={games?.map((game) => {
				return {
					link: window.location.origin + "/game/" + game.game.rawg_slug,
					name: game.game.rawg_name,
					status: game.status,
					score: game.score,
					review: game.review,
					spent_time: parseFloat(game.spent_time),
					poster: game.game.rawg_backdrop_path,
				};
			})}
			statuses={[
				{ value: "Буду играть", label: "Буду играть" },
				{ value: "Играю", label: "Играю" },
				{ value: "Дропнул", label: "Дропнул" },
				{ value: "Прошел", label: "Прошел" },
			]}
			fields={[
				{ label: "Ссылка", key: "link" },
				{ label: "Название", key: "name" },
				{ label: "Статус", key: "status" },
				{ label: "Оценка", key: "score" },
				{ label: "Отзыв", key: "review" },
				{ label: "Время прохождения", key: "spent_time" },
				{ label: "Картинка", key: "poster" },
			]}
			name={"Игры"}
		/>
	);
}

export default GameBlock;
