import React from "react";
import CardGame from "./Cards/CardGame";

function GamesBlock({ games, gamesPage, onPaginate, hidden }) {
	return (
		<div hidden={hidden}>
			<h3>Игры</h3>
			<div className='reslutsBlock'>
				<button
					className='paginationButton'
					disabled={gamesPage === 1}
					onClick={() => {
						onPaginate(gamesPage - 1);
					}}>
					&lt;
				</button>
				<div className='searchCardsGroup'>
					{games.map((game) => (
						<CardGame game={game} key={game.id} />
					))}
				</div>
				<button
					className='paginationButton'
					disabled={games.length < 6}
					onClick={() => {
						onPaginate(gamesPage + 1);
					}}>
					&gt;
				</button>
			</div>
		</div>
	);
}
//onMouseDown={mouseDownHandler}

export default GamesBlock;
