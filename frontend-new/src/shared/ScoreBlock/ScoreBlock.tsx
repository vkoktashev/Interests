import React from "react";
import classnames from "classnames";
import "./score-block.scss";

export function ScoreBlock({ score, text, className }) {
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

	if (!score) {
		return null;
	}

	return (
		<div hidden={!score} className={classnames("score-block", className)}>
			<div className={classnames("score-block__body", "score-block__body_" + getColor(score))}>
				<p>{score}</p>
			</div>
			<p className='score-block__text'>{text}</p>
		</div>
	);
}
