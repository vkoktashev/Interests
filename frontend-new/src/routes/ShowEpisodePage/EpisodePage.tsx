import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {Loader} from '@steroidsjs/core/ui/layout';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {Link} from '@steroidsjs/core/ui/nav';
import {openModal} from '@steroidsjs/core/actions/modal';

import Rating from '../../shared/Rating';
import FriendsActivity from '../../shared/FriendsActivity';
import ScoreBlock from '../../shared/ScoreBlock';
import {ROUTE_SHOW, ROUTE_SHOW_SEASON} from '../index';
import LoginForm from '../../modals/LoginForm';
import "./episode-page.scss";
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {Button, TextField} from '@steroidsjs/core/ui/form';



function EpisodePage() {
	const bem = useBem('episode-page');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const user = useSelector(getUser);

	const { showId, showSeasonId, showEpisodeId } = useSelector(getRouteParams);
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(-1);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);

	const showEpisodeFetchConfig = useMemo(() => showId && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/episode/${showEpisodeId}/`,
		method: 'get',
	}), [showId, showSeasonId, showEpisodeId]);
	const {data: showEpisode, isLoading} = useFetch(showEpisodeFetchConfig);

	const userInfoFetchConfig = useMemo(() => showId && user && ({
		url: `/shows/show/${showId}/season/${showSeasonId}/episode/${showEpisodeId}/user_info/`,
		method: 'get',
	}), [showId, showSeasonId, showEpisodeId]);
	const {data: userInfoResponse, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);
	const userWatchedShow = useMemo(() => userInfoResponse?.user_watched_show, [userInfoResponse]);

	const setEpisodesStatus = useCallback(async (payload) => {
		http.send('PUT', `/shows/show/${showId}/episodes/`, payload).catch(e => {
			fetchUserInfo();
		});
	}, [showId]);

	useEffect(() => {
		setReview("");
		setUserRate(-1);
	}, [showId, showSeasonId, showEpisodeId]);

	useEffect(() => {
		if (showEpisode?.show?.tmdb_name) {
			document.title = showEpisode?.show?.tmdb_name + " - " + showEpisode?.name;
		}
	}, [showEpisode]);

	useEffect(() => {
		setOverviewExpanded(false);
	}, [showId, showSeasonId, showEpisodeId]);

	useEffect(() => {
		if (userInfo?.review) {
			setReview(userInfo.review);
		} else {
			setReview("");
		}

		if (userInfo?.score > -1) {
			setUserRate(userInfo.score);
		} else {
			setUserRate(-1);
		}
	}, [userInfo]);

	const infoRows = useMemo(() => ([
		{label: 'Дата выхода', value: showEpisode?.air_date},
		{label: 'Продолжительность', value: showEpisode?.runtime ? `${showEpisode.runtime} мин` : ''},
		{
			label: 'Сезон',
			value: (
				<Link
					toRoute={ROUTE_SHOW_SEASON}
					toRouteParams={{showId, showSeasonId}}
				>
					{showEpisode?.season_number}
				</Link>
			),
		},
		{label: 'Номер серии', value: showEpisode?.episode_number},
	]).filter(item => item.value !== undefined && item.value !== null && item.value !== ''), [
		showEpisode?.air_date,
		showEpisode?.runtime,
		showEpisode?.season_number,
		showEpisode?.episode_number,
		showId,
		showSeasonId,
	]);

	const overviewPlainText = useMemo(
		() => String(showEpisode?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
		[showEpisode?.overview]
	);
	const canCollapseOverview = overviewPlainText.length > 420;

	if (!showEpisode) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div
				className={bem.element('background')}
				style={{ backgroundImage: `url(${showEpisode?.show?.tmdb_backdrop_path})` }}
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
								src={showEpisode?.still_path}
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
												showId,
											}}>
											{showEpisode?.show?.tmdb_name}
										</Link>
										{" - " + showEpisode?.name}
									</h1>
									<div className={bem.element('info-subheader')}>
										{showEpisode?.show?.tmdb_original_name + " - Season " + showEpisode?.season_number + " - Episode " + showEpisode?.episode_number}
									</div>
								</div>
								<ScoreBlock
									score={showEpisode?.score}
									text='TMDB score'
									className={bem.element('info-score')}
								/>
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
											withEye={true}
											initialRating={userRate}
											onChange={(score) => {
												if (!user) {
													dispatch(openModal(LoginForm));
												} else {
													setUserRate(score);
													setEpisodesStatus({ episodes: [{ tmdb_id: showEpisode?.id, score: score }] });
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
										dangerouslySetInnerHTML={{ __html: showEpisode?.overview }}
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
												label={__('Сохранить')}
												className={bem.element('button')}
												onClick={() => {
													if (!user) {
														dispatch(openModal(LoginForm));
													} else {
														setEpisodesStatus({ episodes: [{ tmdb_id: showEpisode?.id, review: review }] })
															.then(() => {
																dispatch(showNotification('Отзыв сохранен!', 'success', {
																	position: 'top-right',
																	timeOut: 1000,
																}));
															});
													}
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
											Никто из друзей ещё не смотрел эту серию
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

export default EpisodePage;
