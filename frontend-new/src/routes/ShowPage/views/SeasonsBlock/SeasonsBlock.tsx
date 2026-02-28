import React, {useCallback, useEffect, useMemo, useState} from 'react';

import SeasonBlock from "../SeasonBlock";

import "./seasons-block.scss";
import {useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import { setSaveEpisodes } from "actions/modals";
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {Button} from '@steroidsjs/core/ui/form';

function SeasonsBlock({ showId, seasons, userWatchedShow }) {
	const {http} = useComponents();
	const user = useSelector(getUser);
    const dispatch = useDispatch();
	const [dataVersion, setDataVersion] = useState(0);
	const [showSeasons, setShowSeasons] = useState([]);
	const [showSeasonsUserInfo, setShowSeasonsUserInfo] = useState<any>({});
	const [seasonDirtyMap, setSeasonDirtyMap] = useState<Record<string, boolean>>({});
	const hasPendingChanges = useMemo(() => Object.values(seasonDirtyMap).some(Boolean), [seasonDirtyMap]);

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
		setDataVersion(prevState => prevState + 1);
		setSeasonDirtyMap({});
		dispatch(setSaveEpisodes(false));
	}, [showSeasons, showSeasonsUserInfo]);

	const sendAllEpisodes = useCallback(async () => {
		await http.send(
			'PUT',
			`/shows/show/${showId}/complete/`,
		);
		setDataVersion(prevState => prevState + 1);
		setSeasonDirtyMap({});
		dispatch(showNotification('Сериал отмечен просмотренным'));
		dispatch(setSaveEpisodes(false));
	}, [showSeasons]);

	useEffect(() => {
		dispatch(setSaveEpisodes(false));
		setSeasonDirtyMap({});

		return () => {
			dispatch(setSaveEpisodes(false));
			setSeasonDirtyMap({});
		}
	}, [dispatch]);

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
			<div className='seasons-block__actions'>
				<Button
					className='seasons-block__all-button'
					hidden={!user || !userWatchedShow}
					onClick={sendAllEpisodes}>
					Посмотрел весь сериал
				</Button>
				<div className={`seasons-block__save-panel${hasPendingChanges ? '' : ' seasons-block__save-panel_placeholder'}`}>
					{hasPendingChanges ? (
						<>
						<div className='seasons-block__save-panel-text'>Есть несохранённые изменения по сериям</div>
						<Button
							className='seasons-block__save-episodes-button'
							onClick={sendEpisodes}>
							Сохранить
						</Button>
						</>
					) : (
						<>
							<div className='seasons-block__save-panel-text'>Есть несохранённые изменения по сериям</div>
							<Button className='seasons-block__save-episodes-button' disabled>Сохранить</Button>
						</>
					)}
				</div>
			</div>
			{seasons
				?.map((season) => <SeasonBlock
					className='seasons-block__season-block'
					showID={showId}
					seasonNumber={season.season_number}
					key={season.season_number}
					userWatchedShow={userWatchedShow}
					onSeasonLoad={addSeason}
					onSeasonUserInfoLoad={addSeasonUserInfo}
					dataVersion={dataVersion}
					onEpisodesDirtyChange={(hasChanges: boolean) => {
						setSeasonDirtyMap(prev => {
							const key = String(season.season_number);
							if (prev[key] === hasChanges) {
								return prev;
							}
							return {
								...prev,
								[key]: hasChanges,
							};
						});
					}}
				/>)
				.reverse()}
		</div>
	);
}

export default SeasonsBlock;
