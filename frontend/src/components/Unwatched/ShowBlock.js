import React, { useEffect } from "react";
import EpisodeRow from "./EpisodeRow";
import { useHistory } from "react-router-dom";

function ShowBlock({ loggedIn, show, setShowEpisodeUserStatus }) {
	let history = useHistory();

	useEffect(
		() => {},
		// eslint-disable-next-line
		[show]
	);

	return (
		<div className='unwatchedShowBlock'>
			<a
				href={window.location.origin + "/show/" + show.tmdb_id}
				onClick={(e) => {
					history.push("/show/" + show.tmdb_id);
					e.preventDefault();
				}}>
				<h4>{show?.tmdb_name}</h4>
			</a>

			{show?.seasons.map((season, counter) => {
				return (
					<details open={true} className='unwatchedSeasonBlock' key={counter}>
						<summary>{season.tmdb_name}</summary>
						<ul>
							{season.episodes.map((episode, counter) => {
								return (
									<li className='episode' key={counter}>
										<EpisodeRow
											episode={episode}
											showID={show.tmdb_id}
											seasonNumber={season.tmdb_season_number}
											setShowEpisodeUserStatus={setShowEpisodeUserStatus}
											loggedIn={loggedIn}
										/>
									</li>
								);
							})}
						</ul>
					</details>
				);
			})}
		</div>
	);
}

export default ShowBlock;
