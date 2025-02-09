import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";

import DetailEpisodeRow from '../../../../shared/DetailEpisodeRow';
import Rating from '../../../../shared/Rating';

import "./season-block.scss";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {openModal} from '@steroidsjs/core/actions/modal';
import loginForm from '../../../../modals/LoginForm';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_SHOW_SEASON} from '../../../index';
import {setSaveEpisodes} from '../../../../actions/modals';

function SeasonBlock({
	showID,
	seasonNumber,
	userWatchedShow,
	className,
	onSeasonLoad,
	 onSeasonUserInfoLoad,
	dataVersion
}) {
	const bem = useBem('season-block');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);

	const [isChecked, setIsChecked] = useState(0);
	const [userRate, setUserRate] = useState(0);

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

	function getEpisodeByID(episodes, id) {
		for (let episode in episodes) if (episodes[episode].tmdb_id === id) return episodes[episode];
	}

	const setSaveEpisodesLocal = useCallback((value: boolean) => {
		dispatch(setSaveEpisodes(value));
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

	return (
		<LoadingOverlay active={showSeasonIsLoading} spinner text='Загрузка...'>
			<div key={showSeason?.id} className={bem(bem.block(), className)}>
				<Link
					toRoute={ROUTE_SHOW_SEASON}
					toRouteParams={{
						showId: showID,
						showSeasonId: seasonNumber,
					}}
					className='season-block__link'>
					<h5 className='season-block__name'> {showSeason?.name} </h5>
				</Link>
				<div hidden={!user || !userWatchedShow} className='season-block__rate'>
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
				<br />
				<details open={true} className='season-block__episodes'>
					<summary>Развернуть</summary>
					<div hidden={!user || !userWatchedShow} className='season-block__check-all'>
						Выбрать все&nbsp;
						<input
							type='checkbox'
							checked={isChecked > 0}
							onChange={(res) => {
								setSaveEpisodesLocal(true);
								setIsChecked(res.target.checked ? 1 : -1);
							}}
						/>
					</div>
					<ul className='season-block__episodes-ul'>
						{showSeason?.episodes
							?.map((episode, counter) => (
								<li className='season-block__episode' key={counter}>
									<DetailEpisodeRow
										episode={episode}
										showID={showID}
										loggedIn={!!user}
										userInfo={getEpisodeByID(showUserInfo?.episodes_user_info, episode?.id)}
										setEpisodeUserStatus={setEpisodesStatus}
										checkAll={isChecked}
										userWatchedShow={userWatchedShow}
										setSaveEpisodes={setSaveEpisodesLocal}
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
