import React, { useEffect, useState } from "react";
import {Link} from '@steroidsjs/core/ui/nav';

import Rating from '../Rating';
import {ROUTE_SHOW_EPISODE} from '../../routes';
import "./detail-episode-row.scss";

function DetailEpisodeRow({ episode, showID, setEpisodeUserStatus, loggedIn, userInfo, checkAll, userWatchedShow, setSaveEpisodes }) {
	const [userRate, setUserRate] = useState(0);
	const [isChecked, setIsChecked] = useState(false);

	useEffect(() => {
		setUserRate(userInfo?.score);
		setIsChecked(userInfo?.score > -1);
	}, [userInfo]);

	useEffect(() => {
		if (checkAll === -1) {
			setIsChecked(false);
		} else if (checkAll === 1) {
			setIsChecked(true);
		}
	}, [checkAll]);

	function parseDate(date) {
		if (!date) {
			return 'TBA';
		}

		// Backend can return both "yyyy-mm-dd" and already formatted "dd.mm.yyyy".
		if (typeof date === 'string') {
			if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
				return date;
			}
			if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return date.split('-').reverse().join('.');
			}
		}

		const parsedDate = new Date(date);
		if (!Number.isNaN(parsedDate.getTime())) {
			return parsedDate.toLocaleDateString("ru-RU");
		}

		return 'TBA';
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
						setEpisodeUserStatus(showID, { episodes: [{ tmdb_id: episode.id, score: score }] });
					}}
				/>
			</div>
			<Link
				className='detail-episode-row__name'
				toRoute={ROUTE_SHOW_EPISODE}
				toRouteParams={{
					showId: showID,
					showSeasonId: episode.season_number,
					showEpisodeId: episode.episode_number,
				}}
				title={episode.name}>
				Серия {episode.episode_number} - {episode.name}
			</Link>
		</div>
	);
}

export default DetailEpisodeRow;
