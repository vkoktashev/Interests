import React, { useEffect, useState } from "react";
import {useBem} from '@steroidsjs/core/hooks';

import Rating from '../Rating';
import "./detail-episode-row.scss";

function DetailEpisodeRow({
	episode,
	showID,
	setEpisodeUserStatus,
	loggedIn,
	userInfo,
	checkAll,
	userWatchedShow,
	setSaveEpisodes,
	onCheckedChange,
}) {
	const bem = useBem('detail-episode-row');
	const [userRate, setUserRate] = useState(0);
	const [isChecked, setIsChecked] = useState(false);

	useEffect(() => {
		setUserRate(userInfo?.score);
		setIsChecked(userInfo?.score > -1);
		onCheckedChange?.(episode.id, userInfo?.score > -1);
	}, [userInfo]);

	useEffect(() => {
		if (checkAll === -1) {
			setIsChecked(false);
			onCheckedChange?.(episode.id, false);
		} else if (checkAll === 1) {
			setIsChecked(true);
			onCheckedChange?.(episode.id, true);
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
		<div className={bem.block()}>
			<input
				type='checkbox'
				id={`cbEpisode${episode.id}`}
				checked={isChecked}
				onChange={(res) => {
					setSaveEpisodes(true);
					setIsChecked(res.target.checked);
					onCheckedChange?.(episode.id, res.target.checked);
				}}
				hidden={!loggedIn || !userWatchedShow}
				className={bem.element('checkbox')}
			/>
			<p className={bem.element('date')}>{parseDate(episode.air_date)}</p>
			<a
				className={bem.element('name')}
				href={`/show/${showID}/season/${episode.season_number}/episode/${episode.episode_number}`}
				title={episode.name}>
				<span className={bem.element('episode-number')}>Серия {episode.episode_number}</span>
				<span className={bem.element('separator')}>•</span>
				<span className={bem.element('episode-title')}>{episode.name}</span>
			</a>
			<div hidden={!loggedIn || !userWatchedShow} className={bem.element('rate')}>
				<Rating
					withEye={true}
					readonly={!loggedIn}
					initialRating={userRate}
					onChange={(score) => {
						setUserRate(score);
						setIsChecked(score > -1);
						onCheckedChange?.(episode.id, score > -1);
						setEpisodeUserStatus(showID, { episodes: [{ tmdb_id: episode.id, score: score }] });
					}}
				/>
			</div>
		</div>
	);
}

export default DetailEpisodeRow;
