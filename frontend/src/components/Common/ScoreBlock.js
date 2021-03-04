import React from "react";

function ScoreBlock({ score, text, className }) {
	function getColor(score) {
		switch (true) {
			case score >= 80:
				return "green";
			case score >= 60 && score < 80:
				return "yellow";
			case score < 60:
				return "red";
			default:
				return "green";
		}
	}

	return (
		<div hidden={!score} className={className}>
			<div className={"metacritic " + getColor(score)}>
				<p>{score}</p>
			</div>
			<p className='metacriticText'>{text}</p>
		</div>
	);
}

export default ScoreBlock;
