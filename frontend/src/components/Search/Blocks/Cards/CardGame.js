import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

function CardGame({ game }) {
	let history = useHistory();
	const [date, setDate] = useState("");

	useEffect(() => {
		if (game.released) {
			let mas = game.released.split("-");
			let newDate = mas[2] + "." + mas[1] + "." + mas[0];
			setDate(newDate);
		} else setDate("");
	}, [game]);

	return (
		<div className='searchCard'>
			<div className='searchCardImage' style={{ backgroundImage: `url(${game.background_image})` }} />
			<div className='searchCardText'>
				<div className='searchCardName'>
					<a
						href={window.location.origin + "/game/" + game.slug}
						onClick={(e) => {
							history.push("/game/" + game.slug);
							e.preventDefault();
						}}
						title={game.name}>
						<h4>{game.name}</h4>
					</a>
				</div>
				<p>{date}</p>
			</div>
		</div>
	);
}
//onMouseDown={mouseDownHandler}

export default CardGame;
