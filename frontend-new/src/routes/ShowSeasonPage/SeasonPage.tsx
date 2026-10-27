import SaveDock from '../../shared/SaveDock';
import useUnsavedChanges from 'hooks/useUnsavedChanges';
import useSavedValues from 'hooks/useSavedValues';
import useSerialUpdates from 'hooks/useSerialUpdates';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import LazyTrailersBlock from '../../shared/LazyTrailersBlock';
import {ROUTE_SHOW} from '../index';
import LoginForm from '../../modals/LoginForm';
import './season-page.scss';
import {setSaveEpisodes} from '../../actions/modals';
import {Loader} from '@steroidsjs/core/ui/layout';
import {TextField} from '@steroidsjs/core/ui/form';
import {nivoTheme} from '../UserPage/views/StatisticsBlock/chartConfig';
import {saveFailedNotification, savedNotification} from '../../shared/saveNotifications';

function SeasonPage() {
	const bem = useBem('season-page');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);
	const { showId, showSeasonId } = useSelector(getRouteParams);

	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(0);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);
	const [isSaving, setSaving] = useState(false);
	const [isEpisodeSaving, setEpisodeSaving] = useState(false);
	const isBusy = isSaving || isEpisodeSaving;
	const savingRef = useRef(false);
	const sessionRef = useRef(0);
	const reviewInitialized = useRef(false);
	const [saveError, setSaveError] = useState('');
	const [savedEpisodeOverrides, setSavedEpisodeOverrides] = useState<Record<string, any>>({});
	const [episodeCheckedOverrides, setEpisodeCheckedOverrides] = useState<Record<string, boolean>>({});

	const showSeasonFetchConfig = useMemo(() => showId && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/`,
		method: 'get',
	}), [showId, showSeasonId]);
	const {data: showSeason, isLoading} = useFetch(showSeasonFetchConfig);

	const userInfoFetchConfig = useMemo(() => showId && user && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/user_info/`,
		method: 'get',
	}), [showId, showSeasonId, user]);
	const {
		data: userInfoResponse,
		isLoading: userInfoIsLoading,
	} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const {savedValues: savedReview, markSaved: markReviewSaved} = useSavedValues({review: userInfo?.review || ''}, `${user?.id}:${showId}:${showSeasonId}`);
	const hasReviewChanges = review !== savedReview.review;

	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);
	const usersInfo = useMemo(() => userInfoResponse?.users_info, [userInfoResponse]);
	const userWatchedShow = useMemo(() => userInfoResponse?.user_watched_show, [userInfoResponse]);

	const confirmedRate = useRef(0);
	const {sendUpdate, pickFromSnapshot} = useSerialUpdates(`/shows/show/${showId}/season/${showSeasonId}/`, {
		onSettled: ({data}) => {
			if (data) {
				confirmedRate.current = data.score || 0;
				markReviewSaved({review: data.review || ''});
			}
			setUserRate(confirmedRate.current);
		},
	});

	const setShowSeasonStatus = useCallback((payload) => {
		sendUpdate(payload, {notify: true}).catch(() => {});
	}, [sendUpdate]);

	useEffect(() => {
		sessionRef.current += 1;
		reviewInitialized.current = false;
		savingRef.current = false;
		setSaving(false);
		setEpisodeSaving(false);
		setSaveError('');
		setSavedEpisodeOverrides({});
		setReview("");
		setUserRate(0);
		setEpisodeCheckedOverrides({});
		return () => { sessionRef.current += 1; };
	}, [showId, showSeasonId, user?.id]);

	useEffect(() => {
		dispatch(setSaveEpisodes(false));
		return () => {
			dispatch(setSaveEpisodes(false));
		};
	}, [dispatch, showId, showSeasonId]);

	useEffect(() => {
		if (showSeason?.show?.tmdb_name && showSeason?.name) {
			document.title = `${showSeason.show.tmdb_name} - ${showSeason.name}`;
		}
	}, [showSeason?.name, showSeason?.show?.tmdb_name]);

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
	const episodeUserInfo = useMemo(() => {
		const info = new Map<string, any>((userInfoResponse?.episodes_user_info || []).map(item => [String(item.tmdb_id), item]));
		Object.entries(savedEpisodeOverrides).forEach(([id, item]) => info.set(id, item));
		return info;
	}, [userInfoResponse, savedEpisodeOverrides]);

	const pendingEpisodes = useMemo(() => (showSeason?.episodes || []).flatMap(episode => {
		const id = String(episode.id);
		const persisted = episodeUserInfo.get(id)?.score > -1;
		const checked = episodeCheckedOverrides[id] ?? persisted;
		return checked === persisted ? [] : [{tmdb_id: episode.id, score: checked ? 0 : -1}];
	}), [showSeason, episodeUserInfo, episodeCheckedOverrides]);
	const allEpisodesChecked = !!showSeason?.episodes?.length && showSeason.episodes.every(episode => (
		episodeCheckedOverrides[String(episode.id)] ?? (episodeUserInfo.get(String(episode.id))?.score > -1)
	));
	const hasChanges = pendingEpisodes.length > 0 || hasReviewChanges;
	useUnsavedChanges(hasChanges || isBusy);
	useEffect(() => {
		if (!hasChanges) setSaveError('');
	}, [hasChanges]);

	useEffect(() => {
		confirmedRate.current = userInfo?.score || 0;
		const values = pickFromSnapshot({score: confirmedRate.current, review: userInfo?.review || ''});
		if ('score' in values) setUserRate(values.score);
		if (userInfoResponse && !reviewInitialized.current) {
			reviewInitialized.current = true;
			if ('review' in values) setReview(values.review);
		}
	}, [userInfoResponse, userInfo, pickFromSnapshot]);

	const setEpisodesStatus = useCallback(async (currentShowId: string, payload: any) => {
		const session = sessionRef.current;
		setEpisodeSaving(true);
		try {
			await http.send('PUT', `/shows/show/${currentShowId}/episodes/`, payload);
			dispatch(savedNotification());
			if (session === sessionRef.current) {
				setSavedEpisodeOverrides(current => {
					const next = {...current};
					payload.episodes.forEach(item => { next[String(item.tmdb_id)] = {...episodeUserInfo.get(String(item.tmdb_id)), ...item}; });
					return next;
				});
			}
		} catch (error) {
			dispatch(saveFailedNotification());
			throw error;
		} finally {
			if (session === sessionRef.current) setEpisodeSaving(false);
		}
	}, [http, dispatch, episodeUserInfo]);

	const saveChanges = useCallback(async () => {
		if (savingRef.current || isEpisodeSaving || !hasChanges) {
			return;
		}
		savingRef.current = true;
		setSaving(true);
		setSaveError('');
		const session = sessionRef.current;
		const requests: Array<{label: string; save: () => Promise<any>; accept: () => void}> = [];
		if (pendingEpisodes.length > 0) {
			requests.push({
				label: 'отметки серий',
				save: () => http.send('PUT', `/shows/show/${showId}/episodes/`, {episodes: pendingEpisodes}),
				accept: () => {
					setSavedEpisodeOverrides(current => {
						const next = {...current};
						pendingEpisodes.forEach(item => { next[String(item.tmdb_id)] = {...episodeUserInfo.get(String(item.tmdb_id)), ...item}; });
						return next;
					});
					dispatch(setSaveEpisodes(false));
				},
			});
		}
		if (hasReviewChanges) {
			requests.push({
				label: 'отзыв',
				save: () => sendUpdate({review}),
				accept: () => markReviewSaved({review}),
			});
		}
		const results = await Promise.all(requests.map(async request => {
			try {
				await request.save();
				return true;
			} catch {
				return false;
			}
		}));
		if (session !== sessionRef.current) {
			return;
		}
		const succeeded: string[] = [];
		const failed: string[] = [];
		requests.forEach((request, index) => {
			if (results[index]) {
				request.accept();
				succeeded.push(request.label);
			} else {
				failed.push(request.label);
			}
		});
		if (failed.length > 0) {
			setSaveError(`${succeeded.length ? `Сохранено: ${succeeded.join(', ')}. ` : ''}Не удалось сохранить: ${failed.join(', ')}. Повторите сохранение.`);
		} else {
			dispatch(savedNotification());
		}
		savingRef.current = false;
		setSaving(false);
	}, [isEpisodeSaving, hasChanges, pendingEpisodes, hasReviewChanges, review, showId, http, sendUpdate, dispatch, episodeUserInfo, markReviewSaved]);

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
							<img
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

							<div className={bem.element('actions')} hidden={!user}>
								<LoadingOverlay
									active={userInfoIsLoading && !isLoading}
									spinner
									text='Загрузка...'
								>
									<div className={bem.element('actions-group')}>
										<div className={bem.element('actions-rating')}>
										<Rating
											initialRating={userRate}
											readonly={isBusy}
											disabled={!userWatchedShow}
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

					<LazyTrailersBlock
						endpoint={`/shows/show/${showId}/season/${showSeasonId}/trailers/`}
					/>

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
									</div>
									<fieldset disabled={isBusy} className={bem.element('episodes-body')}>
										<div className={bem.element('check-all')} hidden={!user}>
											Выбрать все&nbsp;
											<input
												className={bem.element('check-all-input')}
												type='checkbox'
												disabled={!userWatchedShow}
												checked={allEpisodesChecked}
												onChange={(res) => {
													dispatch(setSaveEpisodes(true));
													setEpisodeCheckedOverrides(Object.fromEntries(showSeason.episodes.map(episode => [String(episode.id), res.target.checked])));
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
															userInfo={episodeUserInfo.get(String(episode.id))}
															checkedValue={episodeCheckedOverrides[String(episode.id)] ?? (episodeUserInfo.get(String(episode.id))?.score > -1)}
															disabled={isBusy}
															setEpisodeUserStatus={setEpisodesStatus}
															checkAll={0}
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
									</fieldset>
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

								<section className={bem.element('content-card', {review: true})} hidden={!user}>
									<h3 className={bem.element('review-header')}>Отзыв</h3>
									<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
										<div className={bem.element('review-body')}>
											<TextField
												value={review}
												placeholder={userWatchedShow ? 'Напишите отзыв…' : 'Выберите статус сериала, чтобы написать отзыв'}
												disabled={isBusy || !userWatchedShow}
												onChange={(value) => setReview(value)}
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

							<section className={bem.element('content-card', {friends: true})} hidden={!user}>
								<h4 className={bem.element('friends-header')}>Отзывы пользователей</h4>
								{usersInfo?.length > 0 ? (
									<FriendsActivity info={usersInfo} />
								) : (
									<div className={bem.element('friends-empty')}>
										Другие пользователи ещё не смотрели этот сезон
									</div>
								)}
							</section>
						</div>
						</div>
						<SaveDock
							visible={hasChanges || isSaving}
							isSaving={isSaving}
							disabled={isBusy}
							error={saveError}
							onSave={saveChanges}
						/>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default SeasonPage;
