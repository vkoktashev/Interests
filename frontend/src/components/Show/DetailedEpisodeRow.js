import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./style.css";
import Rating from "react-rating";
import { MDBIcon } from "mdbreact";

function DetailedEpisodeRow({ episode, showID, setEpisodeUserStatus, loggedIn, userInfo, onChangeStatus, checkAll, userWatchedShow }) {
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
				onChangeStatus({
					addEpisode: userRate > -1,
					episode: {
						tmdb_id: episode.id,
						score: -1,
					},
				});
			} else if (checkAll === 1) {
				setIsChecked(true);
				onChangeStatus({
					addEpisode: !(userRate > -1),
					episode: {
						tmdb_id: episode.id,
						score: 0,
					},
				});
			}
		},
		// eslint-disable-next-line
		[checkAll]
	);

	function parseDate(date) {
		let newDate = new Date(date);
		return newDate.toLocaleDateString("ru-RU");
	}

	return (
		<div className='episodeRow detailRow'>
			<div className='episodeRowCheckDate'>
				<div className='episodeRowCheck' hidden={!loggedIn || typeof onChangeStatus === "undefined" || !userWatchedShow}>
					<input
						type='checkbox'
						checked={isChecked}
						onChange={(res) => {
							setIsChecked(res.target.checked);
							onChangeStatus({
								addEpisode: res.target.checked === !(userRate > -1),
								episode: {
									season_number: episode.season_number,
									episode_number: episode.episode_number,
									score: res.target.checked ? 0 : -1,
								},
							});
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
				className='episodeRowName episodeLink detailRow'
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
