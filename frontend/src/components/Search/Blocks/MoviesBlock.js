import React from "react";
import CardMovie from "./Cards/CardMovie";

function MoviesBlock({ movies, moviesPage, onPaginate, hidden }) {
	return (
		<div hidden={hidden}>
			<h3>Фильмы</h3>
			<div className='reslutsBlock'>
				<button
					className='paginationButton'
					disabled={moviesPage === 1}
					onClick={() => {
						onPaginate(moviesPage - 1);
					}}>
					&lt;
				</button>
				<div className='searchCardsGroup'>
					{movies.map((movie) => (
						<CardMovie movie={movie} key={movie.id} />
					))}
				</div>
				<button
					className='paginationButton'
					disabled={movies.length < 20}
					onClick={() => {
						onPaginate(moviesPage + 1);
					}}>
					&gt;
				</button>
			</div>
		</div>
	);
}
//onMouseDown={mouseDownHandler}

export default MoviesBlock;
