import React, {useCallback, useEffect, useState} from 'react';
import LoadingOverlay from 'react-loading-overlay';

import SeasonBlock from "../SeasonBlock";

import "./seasons-block.scss";
import {useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import { setSaveEpisodes } from "actions/modals";
import {getSaveEpisodes} from '../../../../reducers/modals';
import {showNotification} from '@steroidsjs/core/actions/notifications';

function SeasonsBlock({ showId, seasons, userWatchedShow }) {
	const {http} = useComponents();
	const user = useSelector(getUser);
    const saveEpisodesBlockIsOpen = useSelector(getSaveEpisodes);
    const dispatch = useDispatch();
	const [showSeasons, setShowSeasons] = useState([]);
	const [showSeasonsUserInfo, setShowSeasonsUserInfo] = useState<any>({});

	const getEpisodeByID = useCallback((episodes, id) => {
		for (let episode in episodes) {
			if (episodes[episode].tmdb_id === id) {
				return episodes[episode];
			}
		}
	} ,[]);

	const setEpisodesStatus = useCallback(async (episodesList: any) => {
		await http.send(
			'PUT',
			`/shows/show/${showId}/episodes/`,
			episodesList,
		);
	}, [showId]);

	const sendEpisodes = useCallback(async () => {
		let episodes = [];
		let seasons = [];
		for (const season of showSeasons) {
			for (const episode of season.episodes) {
				let currentValue = getEpisodeByID(showSeasonsUserInfo[season.season_number].episodes_user_info, episode.id);
				let cbValue = (document.getElementById(`cbEpisode${episode.id}`) as any).checked;
				let currentStatus = currentValue?.score > -1;
				if (cbValue !== currentStatus) {
					episodes.push({
						tmdb_id: episode.id,
						score: cbValue ? 0 : -1,
					});
					if (seasons.indexOf(season) === -1) {
						seasons.push(season);
					}
				}
			}
		}
		await setEpisodesStatus({ episodes });
		dispatch(setSaveEpisodes(false));
	}, [showSeasons, showSeasonsUserInfo]);

	const sendAllEpisodes = useCallback(async () => {
		let episodes = [];
		for (let season in showSeasons) {
			if (showSeasons[season].name === "Спецматериалы") {
				continue;
			}
			for (let episode in showSeasons[season].episodes) {
				episodes.push({
					tmdb_id: showSeasons[season].episodes[episode].id,
					score: 0,
				});
			}
		}
		await setEpisodesStatus({ episodes });
		dispatch(showNotification('Сериал отмечмен просмотренным'));
		dispatch(setSaveEpisodes(false));
	}, [showSeasons]);

	useEffect(() => {
		return () => {
			dispatch(setSaveEpisodes(false));
		}
	}, []);

	const addSeason = useCallback((season) => {
		if (!showSeasons.some(showSeason => showSeason.tmdb_id === season.id)) {
			setShowSeasons(prevState => [
				...prevState,
				season,
			]);
		}
	}, []);

	const addSeasonUserInfo = useCallback((seasonId: string, userInfo: any) => {
		setShowSeasonsUserInfo(prevState => ({
			...prevState,
			[seasonId]: userInfo,
		}));
	}, []);

	return (
	<div className='seasons-block'>
			<button
				className='seasons-block__all-button'
				hidden={!user || !userWatchedShow}
				onClick={sendAllEpisodes}>
				Посмотрел весь сериал
			</button>
			{seasons
				?.map((season) => <SeasonBlock
					className='seasons-block__season-block'
					showID={showId}
					seasonNumber={season.season_number}
					key={season.season_number}
					userWatchedShow={userWatchedShow}
					onSeasonLoad={addSeason}
					onSeasonUserInfoLoad={addSeasonUserInfo}
				/>)
				.reverse()}
			<div className='seasons-block__save-episodes-block' hidden={!saveEpisodesBlockIsOpen}>
				<button
					className='seasons-block__save-episodes-button'
					onClick={sendEpisodes}>
					Сохранить
				</button>
			</div>
		</div>
	);
}

export default SeasonsBlock;
