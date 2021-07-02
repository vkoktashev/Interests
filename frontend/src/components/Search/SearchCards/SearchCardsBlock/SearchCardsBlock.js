import React from "react";
import classnames from "classnames";
import SearchCard from "../SearchCard/SearchCard";
import "./search-cards.sass";

function SearchCardsBlock({ name, objects, currentPage, onPaginate, hasNextPage, hidden, className }) {
	return (
		<div hidden={hidden} className={classnames("search-cards", className)}>
			<h3>{name}</h3>
			<div className='search-cards__body'>
				<button
					className='search-cards__pagination'
					disabled={currentPage === 1}
					onClick={() => {
						onPaginate(currentPage - 1);
					}}>
					&lt;
				</button>
				<div className='search-cards__cards'>
					{objects?.map((object) => (
						<SearchCard info={object} key={object.id} className='search-cards__card' />
					))}
					{objects?.length < 1 ? `${name} не найдены` : ""}
				</div>
				<button
					className='search-cards__pagination'
					disabled={!hasNextPage}
					onClick={() => {
						onPaginate(currentPage + 1);
					}}>
					&gt;
				</button>
			</div>
		</div>
	);
}
//onMouseDown={mouseDownHandler}

export default SearchCardsBlock;
