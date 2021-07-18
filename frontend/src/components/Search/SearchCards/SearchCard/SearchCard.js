import React from "react";
import { useHistory } from "react-router-dom";
import classnames from "classnames";
import "./search-card.sass";

function SearchCard({ info, className }) {
	let history = useHistory();

	return (
		<div className={classnames("search-card", className)}>
			<a
				href={window.location.origin + info.link}
				onClick={(e) => {
					history.push(info.link);
					e.preventDefault();
				}}
				title={info.name}>
				<div className='search-card__poster' style={{ backgroundImage: info.poster }} />
				<div className='search-card__body'>
					<div className='search-card__name'>
						<h4>{info.name}</h4>
					</div>
					<p className='search-card__date'>{info.release_date}</p>
				</div>
			</a>
			<div className='search-card__wrapper'>
				<p className='search-card__genres' hidden={!info.genres}>
					Жанр: {info.genres}
				</p>
				<p className='search-card__tags' hidden={!info.tags}>
					Теги: {info.tags}
				</p>
				<p className='search-card__platfroms' hidden={!info.platforms}>
					Платформы: {info.platforms}
				</p>
				<p className='search-card__overview' hidden={!info.overview}>
					{info.overview}
				</p>
			</div>
		</div>
	);
}

export default SearchCard;
