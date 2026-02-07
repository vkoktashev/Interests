import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import { AreaChart, XAxis, Tooltip, YAxis, Area, ResponsiveContainer } from "recharts";
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {openModal} from '@steroidsjs/core/actions/modal';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {Link} from '@steroidsjs/core/ui/nav';

import Rating from '../../shared/Rating';
import FriendsActivity from '../../shared/FriendsActivity';
import DetailEpisodeRow from '../../shared/DetailEpisodeRow';
import Image from '../../shared/Image';
import {ROUTE_SHOW} from '../index';
import LoginForm from '../../modals/LoginForm';
import './season-page.scss';
import {getSaveEpisodes} from '../../reducers/modals';
import {setSaveEpisodes} from '../../actions/modals';
import {Loader} from '@steroidsjs/core/ui/layout';
import {Button, TextField} from '@steroidsjs/core/ui/form';

function SeasonPage() {
	const bem = useBem('season-page');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);
	const saveEpisodesBlockIsOpen = useSelector(getSaveEpisodes);
	const { showId, showSeasonId } = useSelector(getRouteParams);

	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(0);
	const [chartData, setChartData] = useState([]);
	const [isChecked, setIsChecked] = useState(0);

	const showSeasonFetchConfig = useMemo(() => showId && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/`,
		method: 'get',
	}), [showId, showSeasonId]);
	const {data: showSeason, isLoading} = useFetch(showSeasonFetchConfig);

	const userInfoFetchConfig = useMemo(() => showId && user && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/user_info/`,
		method: 'get',
	}), [showId, showSeasonId]);
	const {
		data: userInfoResponse,
		isLoading: userInfoIsLoading,
		fetch: fetchUserInfo,
	} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);
	const userWatchedShow = useMemo(() => userInfoResponse?.user_watched_show, [userInfoResponse]);

	const setShowSeasonStatus = useCallback(async (payload) => {
		http.send('PUT', `/shows/show/${showId}/season/${showSeasonId}/`, payload).catch(e => {
			fetchUserInfo();
		});
	}, [showId]);

	useEffect(() => {
		setReview("");
		setUserRate(0);
		setIsChecked(0);
	}, [showId, showSeasonId]);

	useEffect(() => {
		if (showSeason?.show?.tmdb_name) {
			document.title = showSeason?.show?.tmdb_name + " - " + showSeason?.name;
		}
	}, [showSeason]);

	useEffect(() => {
		setChartData([]);
		if (showSeason?.episodes)
			if (showSeason?.episodes.length > 0) {
				let newData = [];
				for (let episode in showSeason?.episodes) {
					if (showSeason?.episodes[episode].vote_average > 0) {
						newData.push({
							name: "Ep " + showSeason?.episodes[episode].episode_number,
							Оценка: showSeason?.episodes[episode].vote_average
						});
					}
				}
				setChartData(newData);
			}
	}, [showSeason]);

	useEffect(() => {
		if (userInfo?.review) setReview(userInfo.review);
		else setReview("");

		if (userInfo?.score) setUserRate(userInfo.score);
		else setUserRate(0);
	}, [userInfo]);

	function getEpisodeByID(episodes, id) {
		for (let episode in episodes) if (episodes[episode].tmdb_id === id) return episodes[episode];
	}

	const setEpisodesStatus = useCallback(async (showId: string, episodesList: any) => {
		await http.send(
			'PUT',
			`/shows/show/${showId}/episodes/`,
			episodesList,
		);
	}, []);

	const sendEpisodes = useCallback(async () => {
		let episodes = [];
		for (let episode of showSeason.episodes) {
			let currentValue = userInfoResponse.episodes_user_info.find(info => info.tmdb_id === episode.id);
			let cbValue = (document.getElementById(`cbEpisode${episode.id}`) as any).checked;
			let currentStatus = currentValue?.score > -1;
			if (cbValue !== currentStatus) {
				episodes.push({
					tmdb_id: episode.id,
					score: cbValue ? 0 : -1,
				});
			}
		}
		await setEpisodesStatus(showId, { episodes });
		fetchUserInfo();
		dispatch(setSaveEpisodes(false));
	}, [showSeason, userInfoResponse]);

	if (!showSeason) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<Image
				className='season-page__background'
				src={showSeason?.show?.tmdb_backdrop_path}
			/>
			<LoadingOverlay
				active={isLoading}
				spinner
				text='Загрузка...'
			>
				<div className='season-page__body'>
					<div className='season-page__header'>
						<div className='season-page__poster'>
							<Image
								src={showSeason?.poster_path}
								className='season-page__poster-img'
								alt=''
							/>
						</div>
						<div className='season-page__info'>
							<div className='season-page__info-top'>
								<div className='season-page__title-block'>
									<h1 className='season-page__info-header'>
										<Link
											toRoute={ROUTE_SHOW}
											toRouteParams={{
												showId: showId,
											}}>
											{showSeason?.show?.tmdb_name}
										</Link>
										{" - " + showSeason?.name}
									</h1>
									<h5 className='season-page__info-subheader'>
										{showSeason?.show?.tmdb_original_name + " - Season " + showSeason?.season_number}
									</h5>
								</div>
							</div>
							<div className='season-page__info-body'>
								<p hidden={!showSeason?.air_date}>
									Дата выхода: {showSeason?.air_date}
								</p>
								<p hidden={!showSeason?.episodes}>
									Количество серий: {showSeason?.episodes?.length}
								</p>
							</div>
							<div className='season-page__actions' hidden={!user || !userWatchedShow}>
								<LoadingOverlay
									active={userInfoIsLoading && !isLoading}
									spinner
									text='Загрузка...'
								>
									<div className='season-page__actions-group'>
										<Rating
											initialRating={userRate}
											onChange={(score) => {
												if (!user) {
													dispatch(openModal(LoginForm));
												} else {
													setUserRate(score);
													setShowSeasonStatus({ score: score });
												}
											}}
											className='season-page__rating'
										/>
										<TextField
											label={__('Ваш отзыв')}
											value={review}
											onChange={(value) => setReview(value)}
										/>
										<Button
											className={bem.element('review-save-button')}
											label={__('Сохранить')}
											hidden={!user || !userWatchedShow}
											onClick={() => {
												setShowSeasonStatus({ review })
													.then(() => {
														dispatch(showNotification('Отзыв сохранен!', 'success', {
															position: 'top-right',
															timeOut: 1000,
														}));
													});
											}} />
									</div>
								</LoadingOverlay>
							</div>
						</div>
					</div>
					<div className='season-page__overview'>
						<div>
							<h3 className='season-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: showSeason?.overview }} />
						</div>
						<div className='season-page__episodes'>
							<h3 className='season-page__episodes-header'>Список серий</h3>
							<details open={false} className='season-page__episodes-body'>
								<summary>
									Развернуть
								</summary>
								<div hidden={!user || !userWatchedShow}>
									Выбрать все&nbsp;
									<input
										type='checkbox'
										checked={isChecked > 0}
										onChange={(res) => {
											dispatch(setSaveEpisodes(true));
											setIsChecked(res.target.checked ? 1 : -1);
										}}
									/>
								</div>
								<ul className='season-page__episodes-ul'>
									{showSeason?.episodes
										? showSeason?.episodes.map((episode, counter) => (
												<li className='season-page__episode' key={episode.id}>
													<DetailEpisodeRow
														episode={episode}
														showID={showId}
														loggedIn={!!user}
														userInfo={getEpisodeByID(userInfoResponse?.episodes_user_info, episode.id)}
														setEpisodeUserStatus={setEpisodesStatus}
														checkAll={isChecked}
														userWatchedShow={userWatchedShow}
														setSaveEpisodes={value => dispatch(setSaveEpisodes(value))}
													/>
												</li>
										  ))
										: ""}
								</ul>
							</details>
							<div hidden={!chartData?.length}>
								{document.body.clientHeight < document.body.clientWidth ? (
									<ResponsiveContainer width='100%' height={200}>
										<AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
											<defs>
												<linearGradient id='colorUv' x1='0' y1='0' x2='0' y2='1'>
													<stop offset='5%' stopColor='#8884d8' stopOpacity={0.8} />
													<stop offset='95%' stopColor='#8884d8' stopOpacity={0} />
												</linearGradient>
											</defs>
											<XAxis dataKey='name' interval={0} tick={{ fill: "rgb(238, 238, 238)" }} />
											<YAxis tickLine={false} domain={[0, 10]} tick={{ fill: "rgb(238, 238, 238)" }} tickCount={2} />
											<Tooltip contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }} />
											<Area type='monotone' dataKey='Оценка' stroke='#8884d8' fillOpacity={1} fill='url(#colorUv)' />
										</AreaChart>
									</ResponsiveContainer>
								) : (
									<ResponsiveContainer width='100%' height={chartData?.length * 30}>
										<AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout='vertical'>
											<defs>
												<linearGradient id='colorUv' x1='0' y1='0' x2='0' y2='1'>
													<stop offset='5%' stopColor='#8884d8' stopOpacity={0.8} />
													<stop offset='95%' stopColor='#8884d8' stopOpacity={0} />
												</linearGradient>
											</defs>
											<YAxis dataKey='name' interval={0} tick={{ fill: "rgb(238, 238, 238)" }} type='category' />
											<XAxis tickLine={false} domain={[0, 10]} tick={{ fill: "rgb(238, 238, 238)" }} tickCount={2} type='number' />
											<Tooltip contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }} />
											<Area type='monotone' dataKey='Оценка' stroke='#8884d8' fillOpacity={1} fill='url(#colorUv)' />
										</AreaChart>
									</ResponsiveContainer>
								)}
							</div>
						</div>
						<div className='season-page__friends' hidden={!friendsInfo?.length}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
			<div className='season-page__save-episodes-block' hidden={!saveEpisodesBlockIsOpen}>
				<Button
					className='season-page__save-episodes-button'
					onClick={sendEpisodes}>
					Сохранить
				</Button>
			</div>
		</div>
	);
}

export default SeasonPage;
