import React from "react";
import SearchCard from "../SearchCard";
import "./search-cards.scss";
import {useBem} from '@steroidsjs/core/hooks';

function SearchCardsBlock({ objects, hidden, className }: any) {
	const bem = useBem('search-cards');

	return (
		<div hidden={hidden} className={bem(bem.block(), className)}>
			<div className='search-cards__body'>
				<div className='search-cards__cards'>
					{objects?.map((object) => (
						<SearchCard
							info={object}
							key={object.id}
							className='search-cards__card'
						/>
					))}
					{objects?.length < 1 ? `${name} не найдены` : ""}
				</div>
			</div>
		</div>
	);
}
//onMouseDown={mouseDownHandler}

export default SearchCardsBlock;
