import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import "./style.css";
import Rating from "react-rating";
import { MDBIcon } from "mdbreact";

function EpisodeRow({ episode, season, showID, userInfo, setEpisodeUserStatus, loggedIn, onCheckBox, checked }) {
	let history = useHistory();
	const [isChecked, setIsChecked] = useState(false);

	useEffect(() => {
		console.log(userInfo);
	}, [userInfo]);
	useEffect(() => {
		if (typeof checked !== "undefined") setIsChecked(checked);
		else setIsChecked(false);
	}, [checked]);

	return (
		<div className='episodeRow'>
			<input
				type='checkbox'
				checked={isChecked}
				onChange={(res) => {
					onCheckBox(res.target.checked);
				}}
				hidden={!loggedIn}></input>
			&nbsp;
			<a
				className='episodeRowName episodeLink'
				href={window.location.origin + "/show/" + showID + "/season/" + season + "/episode/" + episode}
				onClick={(e) => {
					history.push("/show/" + showID + "/season/" + season + "/episode/" + episode);
					e.preventDefault();
				}}>
				Серия {episode}
			</a>
			<Rating
				start={-1}
				stop={10}
				emptySymbol={[<MDBIcon icon='eye-slash' />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon far icon='star' size='1x' />))}
				fullSymbol={[<MDBIcon icon='eye' />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon icon='star' size='1x' title={n} />))}
				readonly={!loggedIn}
				initialRating={userInfo ? userInfo.score : -1}
				onChange={(score) => {
					setEpisodeUserStatus({ episodes: [{ tmdb_id: episode.id, score: score }] }, showID);
				}}
			/>
		</div>
	);
}

export default EpisodeRow;
