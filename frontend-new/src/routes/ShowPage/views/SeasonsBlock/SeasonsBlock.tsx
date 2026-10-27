import {isEqual} from 'lodash-es';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import SeasonBlock from "../SeasonBlock";

import "./seasons-block.scss";
import {useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import { setSaveEpisodes } from "actions/modals";
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {Button} from '@steroidsjs/core/ui/form';

function getEpisodeAirDate(airDate: unknown): number | null {
	const value = String(airDate || '');
	const localizedMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
	if (localizedMatch) {
		return Date.UTC(
			Number(localizedMatch[3]),
			Number(localizedMatch[2]) - 1,
			Number(localizedMatch[1]),
		);
	}

	const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (isoMatch) {
		return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
	}

	return null;
}

function SeasonsBlock({
	showId,
	seasons,
	userWatchedShow,
	defaultEpisodeRuntime,
	onRuntimeInfoChange,
	onPendingEpisodesChange,
	savedEpisodes,
	onEpisodesSaved,
	disabled,
	onBusyChange,
	onCompleteShow,
}) {
	const {http} = useComponents();
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const user = useSelector(getUser);
    const dispatch = useDispatch();
	const [dataVersion, setDataVersion] = useState(0);
	const [showSeasons, setShowSeasons] = useState([]);
	const [showSeasonsUserInfo, setShowSeasonsUserInfo] = useState<any>({});
	const [pendingBySeason, setPendingBySeason] = useState<Record<string, any[]>>({});
	const pendingEpisodes = useMemo(() => Object.values(pendingBySeason).flat(), [pendingBySeason]);
	const onPendingChange = useCallback((seasonNumber, episodes) => {
		setPendingBySeason(current => isEqual(current[seasonNumber], episodes) ? current : {...current, [seasonNumber]: episodes});
	}, []);
	useEffect(() => { onPendingEpisodesChange(pendingEpisodes); }, [pendingEpisodes, onPendingEpisodesChange]);

	const runtimeInfo = useMemo(() => {
		const regularSeasonNumbers = (seasons || [])
			.map(season => Number(season.season_number))
			.filter(seasonNumber => seasonNumber > 0);
		const loadedRegularSeasons = showSeasons.filter(season => Number(season.season_number) > 0);
		if (loadedRegularSeasons.length < regularSeasonNumbers.length) {
			return null;
		}

		const today = new Date();
		const todayTimestamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
		const episodes = loadedRegularSeasons.flatMap(season => season.episodes || []).filter(episode => {
			const airDate = getEpisodeAirDate(episode.air_date);
			return airDate !== null && airDate <= todayTimestamp;
		});
		if (episodes.length === 0) {
			return null;
		}

		const knownRuntimes = episodes
			.map(episode => Number(episode.runtime || 0))
			.filter(runtime => runtime > 0);
		const fallbackRuntime = Number(defaultEpisodeRuntime || 0) || (
			knownRuntimes.length > 0
				? Math.round(knownRuntimes.reduce((sum, runtime) => sum + runtime, 0) / knownRuntimes.length)
				: 0
		);
		if (fallbackRuntime === 0) {
			return null;
		}

		const getRuntime = episode => Number(episode.runtime || 0) || fallbackRuntime;
		const totalRuntime = episodes.reduce((sum, episode) => sum + getRuntime(episode), 0);
		const hasAllUserInfo = !user || regularSeasonNumbers.every(seasonNumber => (
			Object.prototype.hasOwnProperty.call(showSeasonsUserInfo, String(seasonNumber))
		));
		let remainingRuntime: number | null = null;

		if (user && hasAllUserInfo) {
			const watchedEpisodeIds = new Set(
				Object.values(showSeasonsUserInfo).flatMap((seasonInfo: any) => (
					(seasonInfo?.episodes_user_info || [])
						.filter(episode => Number(episode.score) > -1)
						.map(episode => String(episode.tmdb_id))
				))
			);
			const unwatchedEpisodes = episodes.filter(episode => !watchedEpisodeIds.has(String(episode.id)));
			remainingRuntime = unwatchedEpisodes.reduce((sum, episode) => sum + getRuntime(episode), 0);
		}

		return {
			episodeRuntime: fallbackRuntime,
			totalRuntime,
			remainingRuntime,
		};
	}, [defaultEpisodeRuntime, seasons, showSeasons, showSeasonsUserInfo, user]);

	const sendAllEpisodes = useCallback(async () => {
		if (disabled || !userWatchedShow) {
			return;
		}
		onBusyChange(true);
		try {
			await http.send('PUT', `/shows/show/${showId}/complete/`);
			if (!mounted.current) return;
			onCompleteShow();
			setDataVersion(current => current + 1);
			setPendingBySeason({});
			dispatch(showNotification('Сериал отмечен просмотренным'));
			dispatch(setSaveEpisodes(false));
		} catch {
			dispatch(showNotification('Не удалось отметить сериал просмотренным', 'error'));
		} finally {
			if (mounted.current) onBusyChange(false);
		}
	}, [disabled, userWatchedShow, http, showId, dispatch, onBusyChange, onCompleteShow]);

	useEffect(() => {
		onRuntimeInfoChange(runtimeInfo);
	}, [onRuntimeInfoChange, runtimeInfo]);

	const addSeason = useCallback((season) => {
		setShowSeasons(prevState => {
			const seasonIndex = prevState.findIndex(showSeason => showSeason.id === season.id);
			if (seasonIndex === -1) {
				return [...prevState, season];
			}
			if (prevState[seasonIndex] === season) {
				return prevState;
			}

			const nextState = [...prevState];
			nextState[seasonIndex] = season;
			return nextState;
		});
	}, []);

	const addSeasonUserInfo = useCallback((seasonId: string, userInfo: any) => {
		setShowSeasonsUserInfo(prevState => ({
			...prevState,
			[seasonId]: userInfo,
		}));
	}, []);

	return (
	<div className='seasons-block'>
			{user && (
				<div className='seasons-block__actions'>
					<Button
						className='seasons-block__all-button'
						disabled={disabled || !userWatchedShow}
						onClick={sendAllEpisodes}>
						Посмотрел весь сериал
					</Button>
				</div>
			)}
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
					onPendingChange={onPendingChange}
					savedEpisodes={savedEpisodes}
					onEpisodesSaved={onEpisodesSaved}
					onBusyChange={onBusyChange}
					disabled={disabled}
				/>)
				.reverse()}
		</div>
	);
}

export default SeasonsBlock;
