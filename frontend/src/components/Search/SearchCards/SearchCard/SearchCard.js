import React from "react";
import { useHistory } from "react-router-dom";
import classnames from "classnames";
import "./search-card.sass";

function SearchCard({ info, className }) {
	let history = useHistory();

	return (
		<div className={classnames("search-card", className)}>
			<div className='search-card__poster' style={{ backgroundImage: info.poster }} />
			<div className='search-card__body'>
				<div className='search-card__name'>
					<a
						href={window.location.origin + info.link}
						onClick={(e) => {
							history.push(info.link);
							e.preventDefault();
						}}
						title={info.name}>
						<h4>{info.name}</h4>
					</a>
				</div>
				<p>{info.release_date}</p>
			</div>
		</div>
	);
}

export default SearchCard;
