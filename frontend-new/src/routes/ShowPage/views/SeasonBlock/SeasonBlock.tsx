import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";

import DetailEpisodeRow from '../../../../shared/DetailEpisodeRow';
import Rating from '../../../../shared/Rating';

import "./season-block.scss";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {openModal} from '@steroidsjs/core/actions/modal';
import loginForm from '../../../../modals/LoginForm';
import {setSaveEpisodes} from '../../../../actions/modals';

function SeasonBlock({
	showID,
	seasonNumber,
	userWatchedShow,
	className,
	onSeasonLoad,
	onSeasonUserInfoLoad,
	dataVersion,
	onEpisodesDirtyChange,
}) {
	const bem = useBem('season-block');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);

	const [isChecked, setIsChecked] = useState(0);
	const [userRate, setUserRate] = useState(0);
	const [episodeCheckedOverrides, setEpisodeCheckedOverrides] = useState<Record<string, boolean>>({});

	const showSeasonFetchConfig = useMemo(() => ({
		url: `/shows/show/${showID}/season/${seasonNumber}/`,
		method: 'get',
	}), [showID, seasonNumber]);
	const {data: showSeason, isLoading: showSeasonIsLoading} = useFetch(showSeasonFetchConfig);

	const userInfoFetchConfig = useMemo(() => ({
		url: `/shows/show/${showID}/season/${seasonNumber}/user_info/`,
		method: 'get',
	}), [showID, seasonNumber]);
	const {data: showUserInfo, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

	const totalEpisodesCount = showSeason?.episodes?.length || 0;
	const watchedEpisodesCount = useMemo(() => {
		if (isChecked === 1) {
			return totalEpisodesCount;
		}
		if (isChecked === -1) {
			return 0;
		}

		const persistedMap = new Map(
			(showUserInfo?.episodes_user_info || []).map(item => [String(item.tmdb_id), item?.score > -1])
		);
		const allEpisodeIds = (showSeason?.episodes || []).map(item => String(item.id));
		let count = 0;

		allEpisodeIds.forEach((episodeId) => {
			const override = episodeCheckedOverrides[episodeId];
			const base = persistedMap.get(episodeId) || false;
			if ((override ?? base) === true) {
				count += 1;
			}
		});

		return count;
	}, [isChecked, totalEpisodesCount, showSeason, showUserInfo, episodeCheckedOverrides]);
	const hasPendingEpisodeSelectionChanges = useMemo(() => {
		if (!showSeason?.episodes?.length) {
			return false;
		}

		const persistedMap = new Map(
			(showUserInfo?.episodes_user_info || []).map(item => [String(item.tmdb_id), item?.score > -1])
		);

		return showSeason.episodes.some((episode) => {
			const episodeId = String(episode.id);
			const base = persistedMap.get(episodeId) || false;
			const current = isChecked === 1
				? true
				: isChecked === -1
					? false
					: (episodeCheckedOverrides[episodeId] ?? base);
			return current !== base;
		});
	}, [showSeason, showUserInfo, isChecked, episodeCheckedOverrides]);

	const setSeasonStatus = useCallback(async (payload) => {
		http.send('PUT', `/shows/show/${showID}/season/${seasonNumber}/`, payload).catch(e => {
			fetchUserInfo();
		});
	}, [showID, seasonNumber]);

	const setEpisodesStatus = useCallback((showId: string, episodesList: any[]) => {
		http.send(
			'PUT',
			`/shows/show/${showId}/episodes/`,
			episodesList,
		)
	}, []);

	useEffect(() => {
		if (showUserInfo?.score) {
			setUserRate(showUserInfo.score);
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
	}, [showSeason?.id, showUserInfo]);

	function getEpisodeByID(episodes, id) {
		for (let episode in episodes) if (episodes[episode].tmdb_id === id) return episodes[episode];
	}

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
		onEpisodesDirtyChange?.(hasPendingEpisodeSelectionChanges);
	}, [hasPendingEpisodeSelectionChanges, onEpisodesDirtyChange]);

	if (showSeason && !showSeason?.episodes?.length) {
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
							<span className={bem.element('meta-chip')}>
								Просмотрено {watchedEpisodesCount}/{showSeason?.episodes?.length || 0}
							</span>
						</div>
					</div>

					<div hidden={!user || !userWatchedShow} className={bem.element('rate')}>
						<Rating
							initialRating={userRate}
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
					<div hidden={!user || !userWatchedShow} className={bem.element('check-all')}>
						Выбрать все&nbsp;
						<input
							className={bem.element('check-all-input')}
							type='checkbox'
							checked={isChecked > 0}
							onChange={(res) => {
								setSaveEpisodesLocal(true);
								setIsChecked(res.target.checked ? 1 : -1);
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
										userInfo={getEpisodeByID(showUserInfo?.episodes_user_info, episode?.id)}
										setEpisodeUserStatus={setEpisodesStatus}
										checkAll={isChecked}
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
