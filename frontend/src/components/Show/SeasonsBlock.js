import React, { useState } from "react";
import "./style.css";
import SeasonBlock from "./SeasonBlock";

function SeasonsBlock({ showID, seasons, setShowEpisodeUserStatus, userWatchedShow }) {
	const [needHeader, setNeedHeader] = useState(false);
	const [changedEpisodes, setChangedEpisodes] = useState([]);

	function updateEpisodes(episode) {
		let newChangedEpisodes = changedEpisodes;
		if (episode.addEpisode) newChangedEpisodes.push(episode.episode);
		else {
			const index = newChangedEpisodes.findIndex((i) => i.episode_number === episode.episode.episode_number && i.season_number === episode.episode.season_number);
			if (index > -1) newChangedEpisodes.splice(index, 1);
		}
		setNeedHeader(newChangedEpisodes.length > 0);
		setChangedEpisodes(newChangedEpisodes);
	}

	return (
		<div>
			{seasons
				?.map((season) => (
					<SeasonBlock showID={showID} seasonNumber={season.season_number} key={season.season_number} onChangeStatus={(status) => updateEpisodes(status)} userWatchedShow={userWatchedShow} />
				))
				.reverse()}
			<div className='saveEpisodesHeader' hidden={!needHeader}>
				<button
					className='saveEpisodesButton'
					onClick={() => {
						setShowEpisodeUserStatus({ episodes: changedEpisodes }, showID);
						setNeedHeader(false);
						setChangedEpisodes([]);
					}}>
					Сохранить
				</button>
			</div>
		</div>
	);
}

export default SeasonsBlock;
