import React, { useMemo } from "react";
import SearchCardsBlock from "./SearchCardsBlock";
import {ROUTE_MOVIE, ROUTE_SHOW} from "../../index";

function ShowCards({ shows, hidden }) {
	const objects = useMemo(
		() =>
			shows?.reduce((newObjects, show) => {
				let object: any = {
					name: show.name,
					id: show.id,
					poster: show.backdrop_path,
					route: ROUTE_SHOW,
					routeParams: {
						movieId: show.id,
					},
					overview: show.overview,
				};

				if (show.first_air_date) {
					let mas = show.first_air_date.split("-");
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
