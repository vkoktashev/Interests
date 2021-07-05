import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock/SearchCardsBlock";

function ShowCards({ shows, hidden }) {
	const objects = useMemo(
		() =>
			shows?.reduce((newObjects, show) => {
				let object = {
					name: show.name,
					id: show.id,
					poster: `url(${"http://image.tmdb.org/t/p/w300" + show.backdrop_path})`,
					link: "/show/" + show.id,
				};

				if (show.release_date) {
					let mas = show.release_date.split("-");
					let newDate = mas[2] + "." + mas[1] + "." + mas[0];
					object.release_date = newDate;
				} else object.release_date = "";

				if (object) newObjects.push(object);
				return newObjects;
			}, []),
		[shows]
	);

	return <SearchCardsBlock name='Сериалы' hidden={hidden} objects={objects} />;
}

export default ShowCards;
