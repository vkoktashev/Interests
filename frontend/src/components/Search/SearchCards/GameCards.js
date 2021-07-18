import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock/SearchCardsBlock";

function GameCards({ games, hidden }) {
	const objects = useMemo(
		() =>
			games?.reduce((newObjects, game) => {
				let object = {
					name: game.name,
					id: game.id,
					poster: `url(${game.background_image})`,
					link: "/game/" + game.slug,
					genres: "",
					tags: "",
					platforms: "",
				};

				if (game.released) {
					let mas = game.released.split("-");
					let newDate = mas[2] + "." + mas[1] + "." + mas[0];
					object.release_date = newDate;
				} else object.release_date = "";

				if (game.genres) {
					object.genres = game.genres.reduce((previousValue, genre) => `${previousValue}, ${genre.name}`, "").slice(2);
				}
				if (game.tags) {
					object.tags = game.tags
						.reduce((previousValue, tag, index) => {
							if (index < 6) return `${previousValue}, ${tag.name}`;
							return previousValue;
						}, "")
						.slice(2);
				}
				if (game.platforms) {
					object.platforms = game.platforms.reduce((previousValue, platform) => `${previousValue}, ${platform.platform.name}`, "").slice(2);
				}

				if (object) newObjects.push(object);
				return newObjects;
			}, []),
		[games]
	);

	return <SearchCardsBlock name='Игры' hidden={hidden} objects={objects} />;
}

export default GameCards;
