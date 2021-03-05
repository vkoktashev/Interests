import React from "react";
import { useHistory } from "react-router-dom";
import Rating from "react-rating";
import { MDBIcon } from "mdbreact";

function DetailedEpisodeRow({ episode, showID, seasonNumber, setShowEpisodeUserStatus, loggedIn }) {
	let history = useHistory();

	function parseDate(date) {
		let newDate = new Date(date);
		return newDate.toLocaleDateString("ru-RU");
	}

	return (
		<div className='episodeRow detailRow'>
			<div className='episodeRowCheckDate'>
				<p className='episodeRowDate'>{parseDate(episode.tmdb_release_date)}</p>
			</div>
			<div hidden={!loggedIn} className='episodeRowRate'>
				<Rating
					start={-1}
					stop={10}
					emptySymbol={[<MDBIcon icon='eye-slash' />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon far icon='star' size='1x' />))}
					fullSymbol={[<MDBIcon icon='eye' />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon icon='star' size='1x' title={n} />))}
					readonly={!loggedIn}
					initialRating={-1}
					onChange={(score) => {
						setShowEpisodeUserStatus(
							{
								episodes: [
									{
										tmdb_id: episode.tmdb_id,
										score: score,
									},
								],
							},
							showID
						);
					}}
				/>
			</div>
			<a
				className='episodeRowName episodeLink detailRow'
				href={window.location.origin + "/show/" + showID + "/season/" + seasonNumber + "/episode/" + episode.tmdb_episode_number}
				onClick={(e) => {
					history.push("/show/" + showID + "/season/" + seasonNumber + "/episode/" + episode.tmdb_episode_number);
					e.preventDefault();
				}}
				title={episode.tmdb_name}>
				Серия {episode.tmdb_episode_number} - {episode.tmdb_name}
			</a>
		</div>
	);
}

export default DetailedEpisodeRow;
