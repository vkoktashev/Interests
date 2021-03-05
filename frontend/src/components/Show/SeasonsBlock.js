import React from "react";
import { observer } from "mobx-react";
import LoadingOverlay from "react-loading-overlay";
import ShowStore from "../../store/ShowStore";
import PagesStore from "../../store/PagesStore";
import AuthStore from "../../store/AuthStore";

import SeasonBlock from "./SeasonBlock";

const SeasonsBlock = observer(({ showID, seasons, userWatchedShow }) => {
	const { showSeasonsUserInfo, showSeasons, setEpisodesStatus, setStatusState, anySeasonLoading } = ShowStore;
	const { saveEpisodesBlockIsOpen, setSaveEpisodes } = PagesStore;
	const { loggedIn } = AuthStore;

	function getEpisodeByID(episodes, id) {
		for (let episode in episodes) if (episodes[episode].tmdb_id === id) return episodes[episode];
	}

	function sendEpisodes() {
		let episodes = [];
		let seasons = [];
		for (let season in showSeasons) {
			for (let episode in showSeasons[season].episodes) {
				let currentValue = getEpisodeByID(showSeasonsUserInfo[season].episodes, showSeasons[season].episodes[episode].id);
				let cbValue = document.getElementById(`cbEpisode${showSeasons[season].episodes[episode].id}`).checked;
				let currentStatus = currentValue?.score > -1;
				if (cbValue !== currentStatus) {
					episodes.push({ tmdb_id: currentValue.tmdb_id, score: cbValue ? 0 : -1 });
					if (seasons.indexOf(season) === -1) seasons.push(season);
				}
			}
		}
		setEpisodesStatus({ episodes }, showID, seasons);
		setSaveEpisodes(false);
	}

	function sendAllEpisodes() {
		let episodes = [];
		let seasons = [];
		for (let season in showSeasons) {
			for (let episode in showSeasons[season].episodes) {
				episodes.push({ tmdb_id: showSeasons[season].episodes[episode].id, score: 0 });
				if (seasons.indexOf(season) === -1) seasons.push(season);
			}
		}
		setEpisodesStatus({ episodes }, showID, seasons);
		setSaveEpisodes(false);
	}

	return (
		<LoadingOverlay active={setStatusState === "pending"} spinner text='Обновление...'>
			<button
				className={"checkAllEpisodesButton"}
				hidden={!loggedIn | !userWatchedShow}
				disabled={anySeasonLoading}
				onClick={() => {
					sendAllEpisodes();
				}}>
				Посмотрел весь сериал
			</button>
			{seasons?.map((season) => <SeasonBlock showID={showID} seasonNumber={season.season_number} key={season.season_number} userWatchedShow={userWatchedShow} />).reverse()}
			<div className='saveEpisodesHeader' hidden={!saveEpisodesBlockIsOpen}>
				<button
					className='saveEpisodesButton'
					onClick={() => {
						sendEpisodes();
					}}>
					Сохранить
				</button>
			</div>
		</LoadingOverlay>
	);
});

export default SeasonsBlock;
