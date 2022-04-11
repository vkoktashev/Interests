import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import Rating from '../Rating';

import "./detail-episode-row.sass";

function DetailEpisodeRow({ episode, showID, setEpisodeUserStatus, loggedIn, userInfo, checkAll, userWatchedShow, setSaveEpisodes }) {
	let history = useHistory();
	const [userRate, setUserRate] = useState(0);
	const [isChecked, setIsChecked] = useState(false);

	useEffect(() => {
		setUserRate(userInfo?.score);
		setIsChecked(userInfo?.score > -1);
	}, [userInfo]);

	useEffect(
		() => {
			if (checkAll === -1) {
				setIsChecked(false);
			} else if (checkAll === 1) {
				setIsChecked(true);
			}
		},
		// eslint-disable-next-line
		[checkAll]
	);

	function parseDate(date) {
		let newDate = new Date(date).toLocaleDateString("ru-RU");
		if (newDate !== "Invalid Date") return newDate;
		else return "TBA";
	}

	return (
		<div className='detail-episode-row'>
			<input
				type='checkbox'
				id={`cbEpisode${episode.id}`}
				checked={isChecked}
				onChange={(res) => {
					setSaveEpisodes(true);
					setIsChecked(res.target.checked);
				}}
				hidden={!loggedIn || !userWatchedShow}
			/>
			<p className='detail-episode-row__date'>{parseDate(episode.air_date)}</p>
			<div hidden={!loggedIn || !userWatchedShow} className='detail-episode-row__rate'>
				<Rating
					withEye={true}
					readonly={!loggedIn}
					initialRating={userRate}
					onChange={(score) => {
						setUserRate(score);
						setIsChecked(score > -1);
						setEpisodeUserStatus({ episodes: [{ tmdb_id: episode.id, score: score }] }, showID);
					}}
				/>
			</div>
			<a
				className='detail-episode-row__name'
				href={window.location.origin + "/show/" + showID + "/season/" + episode.season_number + "/episode/" + episode.episode_number}
				onClick={(e) => {
					history.push("/show/" + showID + "/season/" + episode.season_number + "/episode/" + episode.episode_number);
					e.preventDefault();
				}}
				title={episode.name}>
				Серия {episode.episode_number} - {episode.name}
			</a>
		</div>
	);
}

export default DetailEpisodeRow;
