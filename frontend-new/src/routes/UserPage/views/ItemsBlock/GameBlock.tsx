import React from "react";
import ItemBlock from "./ItemBlock";

function GameBlock({ games }) {
	return (
		<ItemBlock
			items={games?.map((game) => {
				return {
					key: game.slug,
					link: window.location.origin + "/game/" + game.slug,
					name: game.name,
					status: game.status,
					score: game.score,
					review: game.review,
					spent_time: parseFloat(game.spent_time),
					poster: game.poster,
					game_status: game.game_status,
				};
			})}
			statuses={[
				{ id: "planned", label: "Буду играть" },
				{ id: "in_progress", label: "Играю" },
				{ id: "dropped", label: "Дропнул" },
				{ id: "completed", label: "Прошел" },
			]}
			fields={[
				{ label: "Ссылка", key: "link" },
				{ label: "Название", key: "name" },
				{ label: "Статус", key: "status" },
				{ label: "Оценка", key: "score" },
				{ label: "Отзыв", key: "review" },
				{ label: "Время прохождения", key: "spent_time" },
				{ label: "Картинка", key: "poster" },
				{ label: "Стадия релиза", key: "game_status" },
			]}
			name={"Игры"}
		/>
	);
}

export default GameBlock;
