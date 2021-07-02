import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock/SearchCardsBlock";

function ShowCards({ shows, showsPage, onPaginate, hidden }) {
	const objects = useMemo(
		() =>
			shows?.reduce((newObjects, show) => {
				let object = {
					name: show.name,
					id: show.id,
					poster: `url(${"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.poster_path})`,
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

	return <SearchCardsBlock name='Сериалы' hidden={hidden} objects={objects} currentPage={showsPage} onPaginate={onPaginate} hasNextPage={objects.length > 19} />;
}

export default ShowCards;
