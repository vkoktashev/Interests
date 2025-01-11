// import React, {useCallback, useEffect, useState} from 'react';
// import LoadingOverlay from "react-loading-overlay";
//
// import SeasonBlock from "../SeasonBlock";
//
// import "./seasons-block.scss";
// import {useDispatch, useSelector} from '@steroidsjs/core/hooks';
// import {getUser} from '@steroidsjs/core/reducers/auth';
// import { setSaveEpisodes } from "actions/modals";
// import {getSaveEpisodes} from '../../../../reducers/modals';
//
// function SeasonsBlock({ showID, seasons, userWatchedShow }) {
// 	const user = useSelector(getUser);
//     const saveEpisodesBlockIsOpen = useSelector(getSaveEpisodes);
//     const dispatch = useDispatch();
// 	const [showSeasons, setShowSeasons] = useState([]);
// 	const [showSeasonsUserInfo, setShowSeasonsUserInfo] = useState<any>({});
//
// 	const getEpisodeByID = useCallback((episodes, id) => {
// 		for (let episode in episodes) {
// 			if (episodes[episode].tmdb_id === id) {
// 				return episodes[episode];
// 			}
// 		}
// 	} ,[]);
//
// 	const sendEpisodes = useCallback(() => {
// 		let episodes = [];
// 		let seasons = [];
// 		for (let season in showSeasons) {
// 			for (let episode in showSeasons[season].episodes) {
// 				let currentValue = getEpisodeByID(showSeasonsUserInfo[season].episodes, showSeasons[season].episodes[episode].id);
// 				let cbValue = (document.getElementById(`cbEpisode${showSeasons[season].episodes[episode].id}`) as any).checked;
// 				let currentStatus = currentValue?.score > -1;
// 				if (cbValue !== currentStatus) {
// 					episodes.push({ tmdb_id: showSeasons[season].episodes[episode].id, score: cbValue ? 0 : -1 });
// 					if (seasons.indexOf(season) === -1) seasons.push(season);
// 				}
// 			}
// 		}
// 		setEpisodesStatus({ episodes }, showID, seasons);
// 		dispatch(setSaveEpisodes(false));
// 	}, []);
//
// 	function sendAllEpisodes() {
// 		let episodes = [];
// 		let seasons = [];
// 		for (let season in showSeasons) {
// 			if (showSeasons[season].name !== "Спецматериалы")
// 				for (let episode in showSeasons[season].episodes) {
// 					episodes.push({ tmdb_id: showSeasons[season].episodes[episode].id, score: 0 });
// 					if (seasons.indexOf(season) === -1) seasons.push(season);
// 				}
// 		}
// 		setEpisodesStatus({ episodes }, showID, seasons);
// 		dispatch(setSaveEpisodes(false));
// 	}
//
// 	useEffect(() => {
// 		return () => {
// 			dispatch(setSaveEpisodes(false));
// 		}
// 	}, []);
//
// 	const addSeason = useCallback((season) => {
// 		if (!showSeasons.some(showSeason => showSeason.tmdb_id === season.id)) {
// 			setShowSeasons(prevState => [
// 				...prevState,
// 				season,
// 			]);
// 		}
// 	}, []);
//
// 	return (
// 		<div className='seasons-block'>
// 			<LoadingOverlay
// 				spinner
// 				text='Обновление...'
// 			>
// 				<button
// 					className='seasons-block__all-button'
// 					hidden={!user || !userWatchedShow}
// 					onClick={() => {
// 						sendAllEpisodes();
// 					}}>
// 					Посмотрел весь сериал
// 				</button>
// 				{seasons
// 					?.map((season) => <SeasonBlock
//                         className='seasons-block__season-block'
//                         showID={showID}
//                         seasonNumber={season.season_number}
//                         key={season.season_number}
//                         userWatchedShow={userWatchedShow}
// 						onSeasonLoad={addSeason}
//                     />)
// 					.reverse()}
// 				<div className='seasons-block__save-episodes-block' hidden={!saveEpisodesBlockIsOpen}>
// 					<button
// 						className='seasons-block__save-episodes-button'
// 						onClick={() => {
// 							sendEpisodes();
// 						}}>
// 						Сохранить
// 					</button>
// 				</div>
// 			</LoadingOverlay>
// 		</div>
// 	);
// }
//
// export default SeasonsBlock;
