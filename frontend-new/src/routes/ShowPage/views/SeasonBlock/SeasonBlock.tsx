import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";

import DetailEpisodeRow from '../../../../shared/DetailEpisodeRow';
import Rating from '../../../../shared/Rating';

import "./season-block.scss";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {openModal} from '@steroidsjs/core/actions/modal';
import loginForm from '../../../../modals/LoginForm';
import {setSaveEpisodes} from '../../../../actions/modals';
import {saveFailedNotification, savedNotification} from '../../../../shared/saveNotifications';

function SeasonBlock({
	showID,
	seasonNumber,
	userWatchedShow,
	className,
	onSeasonLoad,
	onSeasonUserInfoLoad,
	dataVersion,
	onPendingChange,
	savedEpisodes,
	onEpisodesSaved,
	onBusyChange,
	disabled,
}) {
	const bem = useBem('season-block');
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);

	const [userRate, setUserRate] = useState(0);
	const [episodeCheckedOverrides, setEpisodeCheckedOverrides] = useState<Record<string, boolean>>({});

	const showSeasonFetchConfig = useMemo(() => ({
		url: `/shows/show/${showID}/season/${seasonNumber}/`,
		method: 'get',
	}), [showID, seasonNumber]);
	const {
		data: showSeason,
		isLoading: showSeasonIsLoading,
		axiosError: showSeasonError,
	} = useFetch(showSeasonFetchConfig);

	const userInfoFetchConfig = useMemo(() => user && ({
		url: `/shows/show/${showID}/season/${seasonNumber}/user_info/`,
		method: 'get',
	}), [showID, seasonNumber, user]);
	const {data: showUserInfo, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

	const totalEpisodesCount = showSeason?.episodes?.length || 0;
	const episodeInfo = useMemo(() => {
		const info = new Map<string, any>((showUserInfo?.episodes_user_info || []).map(item => [String(item.tmdb_id), item]));
		savedEpisodes.forEach(item => info.set(String(item.tmdb_id), {...info.get(String(item.tmdb_id)), ...item}));
		return info;
	}, [showUserInfo, savedEpisodes]);
	const watchedEpisodesCount = (showSeason?.episodes || []).filter(episode => (
		episodeCheckedOverrides[String(episode.id)] ?? (episodeInfo.get(String(episode.id))?.score > -1)
	)).length;
	const pendingEpisodes = useMemo(() => (showSeason?.episodes || []).flatMap(episode => {
		const persisted = episodeInfo.get(String(episode.id))?.score > -1;
		const checked = episodeCheckedOverrides[String(episode.id)] ?? persisted;
		return persisted === checked ? [] : [{tmdb_id: episode.id, score: checked ? 0 : -1}];
	}), [showSeason, episodeInfo, episodeCheckedOverrides]);

	const setSeasonStatus = useCallback(async (payload) => {
		http.send('PUT', `/shows/show/${showID}/season/${seasonNumber}/`, payload).then(() => {
			dispatch(savedNotification());
		}).catch(() => {
			dispatch(saveFailedNotification());
			fetchUserInfo();
		});
	}, [showID, seasonNumber, dispatch]);

	const setEpisodesStatus = useCallback(async (showId: string, payload: any) => {
		onBusyChange(true);
		try {
			await http.send('PUT', `/shows/show/${showId}/episodes/`, payload);
			dispatch(savedNotification());
			if (mounted.current) onEpisodesSaved(payload.episodes);
		} catch (error) {
			dispatch(saveFailedNotification());
			throw error;
		} finally {
			if (mounted.current) onBusyChange(false);
		}
	}, [http, dispatch, onEpisodesSaved, onBusyChange]);

	useEffect(() => {
		if (showUserInfo?.user_info?.score) {
			setUserRate(showUserInfo.user_info.score);
		} else {
			setUserRate(0);
		}
	}, [showUserInfo]);

	useEffect(() => {
		if (dataVersion > 0) {
			fetchUserInfo();
		}
	}, [dataVersion]);


	useEffect(() => {
		setEpisodeCheckedOverrides({});
	}, [dataVersion]);

	const setSaveEpisodesLocal = useCallback((value: boolean) => {
		dispatch(setSaveEpisodes(value));
	}, [dispatch]);

	const handleEpisodeCheckedChange = useCallback((episodeId: number | string, checked: boolean) => {
		setEpisodeCheckedOverrides(prev => ({
			...prev,
			[String(episodeId)]: checked,
		}));
	}, []);

	useEffect(() => {
		if (showSeason) {
			onSeasonLoad(showSeason);
		}
	}, [showSeason]);

	useEffect(() => {
		if (showUserInfo) {
			onSeasonUserInfoLoad(seasonNumber, showUserInfo);
		}
	}, [showUserInfo]);

	useEffect(() => {
		onPendingChange(seasonNumber, pendingEpisodes);
	}, [seasonNumber, pendingEpisodes, onPendingChange]);

	if (showSeasonError || (!showSeasonIsLoading && !showSeason) || (showSeason && !showSeason.episodes?.length)) {
		return null;
	}

	return (
		<LoadingOverlay active={showSeasonIsLoading} spinner text='Загрузка...'>
			<div key={showSeason?.id} className={bem(bem.block(), className)}>
				<div className={bem.element('header')}>
					<div className={bem.element('title-col')}>
						<a
							href={`/show/${showID}/season/${seasonNumber}`}
							className={bem.element('link')}>
							<h5 className={bem.element('name')}>{showSeason?.name}</h5>
						</a>
						<div className={bem.element('meta')}>
							<span className={bem.element('meta-chip')}>{showSeason?.episodes?.length || 0} серий</span>
							<span
								className={bem.element('meta-chip', {
									completed: totalEpisodesCount > 0 && watchedEpisodesCount >= totalEpisodesCount,
								})}
							>
								Просмотрено {watchedEpisodesCount}/{showSeason?.episodes?.length || 0}
							</span>
						</div>
					</div>

					<div hidden={!user} className={bem.element('rate')}>
						<Rating
							initialRating={userRate}
							readonly={disabled}
							disabled={!userWatchedShow}
							onChange={(score) => {
								if (!user) {
									dispatch(openModal(loginForm));
								} else {
									setUserRate(score);
									setSeasonStatus({ score: score });
								}
							}}
						/>
					</div>
				</div>

				<details className={bem.element('episodes')}>
					<summary className={bem.element('summary')}>Список серий</summary>
					<div hidden={!user} className={bem.element('check-all')}>
						Выбрать все&nbsp;
						<input
							className={bem.element('check-all-input')}
							type='checkbox'
							disabled={disabled || userInfoIsLoading || !userWatchedShow}
							checked={totalEpisodesCount > 0 && watchedEpisodesCount === totalEpisodesCount}
							onChange={(res) => {
								setSaveEpisodesLocal(true);
								setEpisodeCheckedOverrides(Object.fromEntries(showSeason.episodes.map(episode => [String(episode.id), res.target.checked])));
							}}
						/>
					</div>
					<ul className={bem.element('episodes-ul')}>
						{showSeason?.episodes
							?.map((episode, counter) => (
								<li className={bem.element('episode')} key={counter}>
									<DetailEpisodeRow
										episode={episode}
										showID={showID}
										loggedIn={!!user}
										userInfo={episodeInfo.get(String(episode.id))}
										checkedValue={episodeCheckedOverrides[String(episode.id)] ?? (episodeInfo.get(String(episode.id))?.score > -1)}
										disabled={disabled || userInfoIsLoading}
										setEpisodeUserStatus={setEpisodesStatus}
										checkAll={0}
										userWatchedShow={userWatchedShow}
										setSaveEpisodes={setSaveEpisodesLocal}
										onCheckedChange={handleEpisodeCheckedChange}
									/>
								</li>
							))
							.reverse()}
					</ul>
				</details>
			</div>
		</LoadingOverlay>
	);
}

export default SeasonBlock;
