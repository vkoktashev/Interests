import React from "react";
import classnames from "classnames";
import SearchCard from "../SearchCard/SearchCard";
import "./search-cards.sass";

function SearchCardsBlock({ name, objects, hidden, className }) {
	return (
		<div hidden={hidden} className={classnames("search-cards", className)}>
			<h3>{name}</h3>
			<div className='search-cards__body'>
				<div className='search-cards__cards'>
					{objects?.map((object) => (
						<SearchCard info={object} key={object.id} className='search-cards__card' />
					))}
					{objects?.length < 1 ? `${name} не найдены` : ""}
				</div>
			</div>
		</div>
	);
}
//onMouseDown={mouseDownHandler}

export default SearchCardsBlock;
