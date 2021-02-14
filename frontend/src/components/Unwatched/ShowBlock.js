import React, { useEffect } from "react";
import EpisodeRow from "./EpisodeRow";

function ShowBlock({ loggedIn, show, setShowEpisodeUserStatus }) {
	useEffect(
		() => {},
		// eslint-disable-next-line
		[show]
	);

	return (
		<div className='unwatchedShowBlock'>
			<h4>{show?.tmdb_name}</h4>
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
