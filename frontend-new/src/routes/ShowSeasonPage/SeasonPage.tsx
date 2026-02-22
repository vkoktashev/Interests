import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {ResponsiveLine} from '@nivo/line';
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
import {setSaveEpisodes} from '../../actions/modals';
import {Loader} from '@steroidsjs/core/ui/layout';
import {Button, TextField} from '@steroidsjs/core/ui/form';
import {nivoTheme} from '../UserPage/views/StatisticsBlock/chartConfig';

function SeasonPage() {
	const bem = useBem('season-page');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);
	const { showId, showSeasonId } = useSelector(getRouteParams);

	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(0);
	const [isChecked, setIsChecked] = useState(0);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);
	const [hasPendingEpisodeChanges, setHasPendingEpisodeChanges] = useState(false);
	const [episodeCheckedOverrides, setEpisodeCheckedOverrides] = useState<Record<string, boolean>>({});

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
		setHasPendingEpisodeChanges(false);
		setEpisodeCheckedOverrides({});
	}, [showId, showSeasonId]);

	useEffect(() => {
		dispatch(setSaveEpisodes(false));
		setHasPendingEpisodeChanges(false);
		setEpisodeCheckedOverrides({});

		return () => {
			dispatch(setSaveEpisodes(false));
			setHasPendingEpisodeChanges(false);
			setEpisodeCheckedOverrides({});
		};
	}, [dispatch, showId, showSeasonId]);

	useEffect(() => {
		if (showSeason?.show?.tmdb_name) {
			document.title = showSeason?.show?.tmdb_name + " - " + showSeason?.name;
		}
	}, [showSeason]);

	useEffect(() => {
		setOverviewExpanded(false);
	}, [showId, showSeasonId]);

	const chartData = useMemo(() => {
		const points = (showSeason?.episodes || [])
			.filter(episode => Number(episode?.vote_average) > 0)
			.map(episode => ({
				x: `Ep ${episode.episode_number}`,
				y: Number(episode.vote_average),
			}));

		return [
			{
				id: 'rating',
				data: points,
			},
		];
	}, [showSeason]);

	const infoRows = useMemo(() => ([
		{label: 'Дата выхода', value: showSeason?.air_date},
		{label: 'Количество серий', value: showSeason?.episodes?.length},
	]).filter(item => item.value !== undefined && item.value !== null && item.value !== ''), [
		showSeason?.air_date,
		showSeason?.episodes?.length,
	]);

	const overviewPlainText = useMemo(
		() => String(showSeason?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
		[showSeason?.overview]
	);
	const canCollapseOverview = overviewPlainText.length > 420;
	const hasPendingEpisodeSelectionChanges = useMemo(() => {
		if (!showSeason?.episodes?.length || !userInfoResponse?.episodes_user_info) {
			return false;
		}

		const persistedMap = new Map(
			(userInfoResponse.episodes_user_info || []).map(item => [String(item.tmdb_id), item?.score > -1])
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
	}, [showSeason, userInfoResponse, isChecked, episodeCheckedOverrides]);

	useEffect(() => {
		setHasPendingEpisodeChanges(hasPendingEpisodeSelectionChanges);
	}, [hasPendingEpisodeSelectionChanges]);

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
		setHasPendingEpisodeChanges(false);
		setEpisodeCheckedOverrides({});
		dispatch(setSaveEpisodes(false));
	}, [showSeason, userInfoResponse]);

	if (!showSeason) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div
				className={bem.element('background')}
				style={{ backgroundImage: `url(${showSeason?.show?.tmdb_backdrop_path})` }}
			/>
			<LoadingOverlay
				active={isLoading}
				spinner
				text='Загрузка...'
			>
				<div className={bem.element('body')}>
					<div className={bem.element('header')}>
						<div className={bem.element('poster')}>
							<Image
								src={showSeason?.poster_path}
								className={bem.element('poster-img')}
								alt=''
							/>
						</div>
						<div className={bem.element('info')}>
							<div className={bem.element('title-row')}>
								<div className={bem.element('title-block')}>
									<h1 className={bem.element('info-header')}>
										<Link
											toRoute={ROUTE_SHOW}
											toRouteParams={{
												showId: showId,
											}}>
											{showSeason?.show?.tmdb_name}
										</Link>
										{" - " + showSeason?.name}
									</h1>
									<div className={bem.element('info-subheader')}>
										{showSeason?.show?.tmdb_original_name + " - Season " + showSeason?.season_number}
									</div>
								</div>
							</div>

							<div className={bem.element('info-panel')}>
								<div className={bem.element('info-list')}>
									{infoRows.map(item => (
										<div key={item.label} className={bem.element('info-row')}>
											<span className={bem.element('info-row-label')}>{item.label}</span>
											<span className={bem.element('info-row-value')}>{item.value}</span>
										</div>
									))}
								</div>
							</div>

							<div className={bem.element('actions')} hidden={!user || !userWatchedShow}>
								<LoadingOverlay
									active={userInfoIsLoading && !isLoading}
									spinner
									text='Загрузка...'
								>
									<div className={bem.element('actions-group')}>
										<div className={bem.element('actions-rating')}>
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
											className={bem.element('rating')}
										/>
										</div>
									</div>
								</LoadingOverlay>
							</div>
						</div>
					</div>

					<div className={bem.element('overview')}>
						<div className={bem.element('content-grid')}>
							<div className={bem.element('main-column')}>
								<section className={bem.element('content-card', {description: true})}>
									<h3 className={bem.element('overview-header')}>Описание</h3>
									<div
										className={bem.element('overview-content', {
											collapsed: canCollapseOverview && !isOverviewExpanded,
										})}
										dangerouslySetInnerHTML={{ __html: showSeason?.overview }}
									/>
									<div className={bem.element('overview-actions')} hidden={!canCollapseOverview}>
										<button
											type='button'
											className={bem.element('overview-toggle')}
											onClick={() => setOverviewExpanded(prev => !prev)}
										>
											{isOverviewExpanded ? 'Свернуть' : 'Показать полностью'}
										</button>
									</div>
								</section>

								<section className={bem.element('content-card', {episodes: true})}>
									<div className={bem.element('episodes-head')}>
										<h3 className={bem.element('episodes-header')}>Список серий</h3>
										<div className={bem.element('save-panel', {
											inline: true,
											placeholder: !hasPendingEpisodeChanges,
										})}>
											{hasPendingEpisodeChanges ? (
												<>
												<div className={bem.element('save-panel-text')}>Есть несохранённые изменения</div>
												<Button
													className={bem.element('save-panel-button')}
													onClick={sendEpisodes}>
													Сохранить
												</Button>
												</>
											) : (
												<>
													<div className={bem.element('save-panel-text')}>Есть несохранённые изменения</div>
													<Button className={bem.element('save-panel-button')} disabled>Сохранить</Button>
												</>
											)}
										</div>
									</div>
									<div className={bem.element('episodes-body')}>
										<div className={bem.element('check-all')} hidden={!user || !userWatchedShow}>
											Выбрать все&nbsp;
											<input
												className={bem.element('check-all-input')}
												type='checkbox'
												checked={isChecked > 0}
												onChange={(res) => {
													dispatch(setSaveEpisodes(true));
													setIsChecked(res.target.checked ? 1 : -1);
												}}
											/>
										</div>
										<ul className={bem.element('episodes-ul')}>
											{showSeason?.episodes
												? showSeason.episodes.map((episode) => (
													<li className={bem.element('episode')} key={episode.id}>
														<DetailEpisodeRow
															episode={episode}
															showID={showId}
															loggedIn={!!user}
															userInfo={getEpisodeByID(userInfoResponse?.episodes_user_info, episode.id)}
															setEpisodeUserStatus={setEpisodesStatus}
															checkAll={isChecked}
															userWatchedShow={userWatchedShow}
															setSaveEpisodes={value => {
																dispatch(setSaveEpisodes(value));
															}}
															onCheckedChange={(episodeId, checked) => {
																setEpisodeCheckedOverrides(prev => ({
																	...prev,
																	[String(episodeId)]: checked,
																}));
															}}
														/>
													</li>
												))
												: ""}
										</ul>
									</div>
									<div hidden={chartData[0].data.length < 1} className={bem.element('rating-chart')}>
										<ResponsiveLine
											data={chartData}
											theme={nivoTheme}
											margin={{top: 14, right: 18, bottom: 44, left: 46}}
											colors={['#4f5dea']}
											enableArea
											areaOpacity={0.2}
											curve='monotoneX'
											lineWidth={3}
											pointSize={8}
											pointColor='#4f5dea'
											pointBorderWidth={2}
											pointBorderColor='#191a1b'
											enableGridX={false}
											enableGridY
											yScale={{type: 'linear', min: 0, max: 10}}
											axisTop={null}
											axisRight={null}
											axisBottom={{
												tickSize: 0, tickPadding: 10, legend: 'Серии', legendOffset: 32, legendPosition: 'middle',
											}}
											axisLeft={{
												tickSize: 0, tickPadding: 8, legend: 'Оценка', legendOffset: -34, legendPosition: 'middle',
											}}
											useMesh
											tooltip={({point}) => (
												<div className={bem.element('chart-tooltip')}>
													<div>{point.data.xFormatted}</div>
													<strong>{point.data.yFormatted}</strong>
												</div>
											)}
										/>
									</div>
								</section>

								<section className={bem.element('content-card', {review: true})} hidden={!user || !userWatchedShow}>
									<h3 className={bem.element('review-header')}>Отзыв</h3>
									<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
										<div className={bem.element('review-body')}>
											<TextField
												label={__('Ваш отзыв')}
												value={review}
												onChange={(value) => setReview(value)}
											/>
											<Button
												className={bem.element('button')}
												label={__('Сохранить')}
												onClick={() => {
													setShowSeasonStatus({ review })
														.then(() => {
															dispatch(showNotification('Отзыв сохранен!', 'success', {
																position: 'top-right',
																timeOut: 1000,
															}));
														});
												}}
											/>
										</div>
									</LoadingOverlay>
								</section>
							</div>

							<div className={bem.element('side-column')}>
								<section className={bem.element('content-card', {friends: true})} hidden={!user}>
									<h4 className={bem.element('friends-header')}>Отзывы друзей</h4>
									{friendsInfo?.length > 0 ? (
										<FriendsActivity info={friendsInfo} />
									) : (
										<div className={bem.element('friends-empty')}>
											Никто из друзей ещё не смотрел этот сезон
										</div>
									)}
								</section>
							</div>
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default SeasonPage;
