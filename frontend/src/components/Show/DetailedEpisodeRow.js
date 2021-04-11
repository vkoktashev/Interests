import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import Rating from "react-rating";
import { MDBIcon } from "mdbreact";

function DetailedEpisodeRow({ episode, showID, setEpisodeUserStatus, loggedIn, userInfo, checkAll, userWatchedShow, setSaveEpisodes }) {
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
		<div className='episodeRow detailRow'>
			<div className='episodeRowCheckDate'>
				<div className='episodeRowCheck' hidden={!loggedIn || !userWatchedShow}>
					<input
						type='checkbox'
						id={`cbEpisode${episode.id}`}
						checked={isChecked}
						onChange={(res) => {
							setSaveEpisodes(true);
							setIsChecked(res.target.checked);
						}}
					/>
				</div>
				<p className='episodeRowDate'>{parseDate(episode.air_date)}</p>
			</div>
			<div hidden={!loggedIn || !userWatchedShow} className='episodeRowRate'>
				<Rating
					start={-1}
					stop={10}
					emptySymbol={[<MDBIcon icon='eye-slash' />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon far icon='star' size='1x' />))}
					fullSymbol={[<MDBIcon icon='eye' />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon icon='star' size='1x' title={n} />))}
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
				className='episodeRowName detailRow'
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

export default DetailedEpisodeRow;
