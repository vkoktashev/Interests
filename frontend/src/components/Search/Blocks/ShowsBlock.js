import React from "react";
import CardShow from "./Cards/CardShow";

function ShowsBlock({ shows, showsPage, onPaginate, hidden }) {
	return (
		<div hidden={hidden}>
			<h3>Сериалы</h3>
			<div className='reslutsBlock'>
				<button
					className='paginationButton'
					disabled={showsPage === 1}
					onClick={() => {
						onPaginate(showsPage - 1);
					}}>
					&lt;
				</button>
				<div className='searchCardsGroup'>
					{shows.map((show) => (
						<CardShow show={show} key={show.id} />
					))}
				</div>
				<button
					className='paginationButton'
					disabled={shows.length < 20}
					onClick={() => {
						onPaginate(showsPage + 1);
					}}>
					&gt;
				</button>
			</div>
		</div>
	);
}

export default ShowsBlock;
