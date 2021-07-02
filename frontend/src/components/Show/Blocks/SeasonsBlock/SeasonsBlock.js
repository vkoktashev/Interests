import React from "react";
import { toJS } from "mobx";
import { observer } from "mobx-react";
import LoadingOverlay from "react-loading-overlay";
import ShowStore from "../../../../store/ShowStore";
import PagesStore from "../../../../store/PagesStore";
import AuthStore from "../../../../store/AuthStore";

import SeasonBlock from "../SeasonBlock/SeasonBlock";
import "./seasons-block.sass";

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
					episodes.push({ tmdb_id: showSeasons[season].episodes[episode].id, score: cbValue ? 0 : -1 });
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
			console.log(toJS(showSeasons));
			if (showSeasons[season].name !== "Спецматериалы")
				for (let episode in showSeasons[season].episodes) {
					episodes.push({ tmdb_id: showSeasons[season].episodes[episode].id, score: 0 });
					if (seasons.indexOf(season) === -1) seasons.push(season);
				}
		}
		setEpisodesStatus({ episodes }, showID, seasons);
		setSaveEpisodes(false);
	}

	return (
		<div className='seasons-block'>
			<LoadingOverlay active={setStatusState === "pending"} spinner text='Обновление...'>
				<button
					className='seasons-block__all-button'
					hidden={!loggedIn | !userWatchedShow}
					disabled={anySeasonLoading}
					onClick={() => {
						sendAllEpisodes();
					}}>
					Посмотрел весь сериал
				</button>
				{seasons
					?.map((season) => <SeasonBlock className='seasons-block__season-block' showID={showID} seasonNumber={season.season_number} key={season.season_number} userWatchedShow={userWatchedShow} />)
					.reverse()}
				<div className='seasons-block__save-episodes-block' hidden={!saveEpisodesBlockIsOpen}>
					<button
						className='seasons-block__save-episodes-button'
						onClick={() => {
							sendEpisodes();
						}}>
						Сохранить
					</button>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default SeasonsBlock;
