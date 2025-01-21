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
import Image from "../../shared/Image";
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

	if (!showEpisode) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<Image
				className='episode-page__background'
				src={showEpisode?.show?.tmdb_backdrop_path}
			/>
			<LoadingOverlay
				active={isLoading}
				spinner
				text='Загрузка...'
			>
				<div className='episode-page__body'>
					<div className='episode-page__header'>
						<div className='episode-page__poster'>
							<Image src={showEpisode?.still_path}  alt='' />
						</div>
						<div className='episode-page__info'>
							<h1 className='episode-page__info-header'>
								<Link
									toRoute={ROUTE_SHOW}
									toRouteParams={{
										showId,
									}}>
									{showEpisode?.show?.tmdb_name}
								</Link>
								{" - " + showEpisode?.name}
							</h1>
							<h5 className='episode-page__info-subheader'>
								{showEpisode?.show?.tmdb_original_name + " - Season " + showEpisode?.season_number + " - Episode " + showEpisode?.episode_number}
							</h5>
							<div className='episode-page__info-body'>
								<p hidden={!showEpisode?.air_date}>
									Дата выхода: {showEpisode?.air_date}
								</p>
								<p hidden={!showEpisode?.runtime}>
									Продолжительность (мин): {showEpisode?.runtime}
								</p>
								<Link
									toRoute={ROUTE_SHOW_SEASON}
									toRouteParams={{
										showId,
										showSeasonId,
									}}>
									Сезон: {showEpisode?.season_number}
								</Link>
							</div>
							<div hidden={!user || !userWatchedShow}>
								<LoadingOverlay
									active={userInfoIsLoading && !isLoading}
									spinner
									text='Загрузка...'
								>
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
										className='episode-page__rating'
									/>
									<TextField
										label={__('Ваш отзыв')}
										value={review}
										onChange={(value) => setReview(value)}
									/>
									<Button
										label={__('Сохранить')}
										className={bem.element('button')}
										hidden={!user || !userWatchedShow}
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
										}} />
								</LoadingOverlay>
							</div>
							<ScoreBlock
								score={showEpisode?.score}
								text='TMDB score'
								className='episode-page__info-score'
							/>
						</div>
					</div>
					<div className='episode-page__overview'>
						<div>
							<h3>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: showEpisode?.overview }} />
						</div>
						<div className='episode-page__friends' hidden={!friendsInfo?.length}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default EpisodePage;
