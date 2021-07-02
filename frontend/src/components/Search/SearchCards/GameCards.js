import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock/SearchCardsBlock";

function GameCards({ games, gamesPage, onPaginate, hidden }) {
	const objects = useMemo(
		() =>
			games?.reduce((newObjects, game) => {
				let object = {
					name: game.name,
					id: game.id,
					poster: `url(${game.background_image})`,
					link: "/game/" + game.slug,
				};

				if (game.released) {
					let mas = game.released.split("-");
					let newDate = mas[2] + "." + mas[1] + "." + mas[0];
					object.release_date = newDate;
				} else object.release_date = "";

				if (object) newObjects.push(object);
				return newObjects;
			}, []),
		[games]
	);

	return <SearchCardsBlock name='Игры' hidden={hidden} objects={objects} currentPage={gamesPage} onPaginate={onPaginate} hasNextPage={objects.length === 6} />;
}

export default GameCards;
