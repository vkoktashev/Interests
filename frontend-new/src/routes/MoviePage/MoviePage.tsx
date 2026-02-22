import React, {useCallback, useEffect, useMemo, useState} from 'react';
import ReactPlayer from "react-player/youtube";
import { Carousel } from "react-responsive-carousel";
import LoadingOverlay from "react-loading-overlay";

import StatusButtonGroup from '../../shared/StatusButtonGroup';
import FriendsActivity from '../../shared/FriendsActivity';
import ScoreBlock from '../../shared/ScoreBlock';
import Rating from '../../shared/Rating';

import "react-responsive-carousel/lib/styles/carousel.min.css";
import "./movie-page.scss";
import Image from "../../shared/Image";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParam} from '@steroidsjs/core/reducers/router';
import {Loader} from '@steroidsjs/core/ui/layout';
import {openModal} from '@steroidsjs/core/actions/modal';
import LoginForm from '../../modals/LoginForm';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {Button, TextField} from '@steroidsjs/core/ui/form';

export function MoviePage() {
	const bem = useBem('movie-page');
	const user = useSelector(getUser);
	const dispatch = useDispatch();
	const {http} = useComponents();
	const movieId = useSelector(state => getRouteParam(state, 'movieId'));
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);

	const movieFetchConfig = useMemo(() => movieId && ({
		url: `/movies/movie/${movieId}/`,
		method: 'get',
	}), [movieId]);
	const {data: movie, isLoading} = useFetch(movieFetchConfig);

	const userInfoFetchConfig = useMemo(() => movieId && user && ({
		url: `/movies/movie/${movieId}/user_info/`,
		method: 'get',
	}), [movieId]);
	const {data: userInfoResponse, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);

	const setMovieStatus = useCallback(async (payload) => {
		http.send('PUT', `/movies/movie/${movieId}/`, payload).catch(e => {
			fetchUserInfo();
		});
	}, [movieId]);

	useEffect(() => {
			setReview("");
			setUserStatus("Не смотрел");
			setUserRate(0);
		}, [movieId]);

	useEffect(() => {
			if (!user) {
				setReview("");
				setUserRate(0);
				setUserStatus("Не смотрел");
			}
		},[user]);

	useEffect(() => {
		document.title = movie?.name || 'Interests';
	}, [movie]);

	useEffect(() => {
		setOverviewExpanded(false);
	}, [movieId]);

	useEffect(
		() => {
			if (userInfo?.status) {
				setReview(userInfo.review);
				setUserStatus(userInfo.status);
				setUserRate(userInfo.score);
			} else {
				setReview("");
				setUserRate(0);
				setUserStatus("Не смотрел");
			}
		},
		// eslint-disable-next-line
		[userInfo]
	);

	const renderVideo = (video, index) => (
		<div className={bem.element('trailer')} key={video.url}>
			<ReactPlayer url={video.url} controls key={index} className={bem.element('trailer-player')} />
		</div>
	);

	const infoRows = useMemo(() => ([
		{label: 'Дата релиза', value: movie?.release_date},
		{label: 'Продолжительность', value: movie?.runtime ? `${movie.runtime} мин` : ''},
		{label: 'Жанр', value: movie?.genres},
		{label: 'Компания', value: movie?.production_companies},
		{label: 'Слоган', value: movie?.tagline},
		{label: 'В ролях', value: movie?.cast},
		{label: 'Режиссер', value: movie?.directors},
	]).filter(item => Boolean(item.value)), [
		movie?.release_date,
		movie?.runtime,
		movie?.genres,
		movie?.production_companies,
		movie?.tagline,
		movie?.cast,
		movie?.directors,
	]);

	const overviewPlainText = useMemo(
		() => String(movie?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
		[movie?.overview]
	);
	const canCollapseOverview = overviewPlainText.length > 420;

	if (!movie) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div
				className={bem.element('background')}
				style={{ backgroundImage: `url(${movie?.backdrop_path})` }}
			/>
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
				<div className={bem.element('body')}>
					<div className={bem.element('header')}>
						<div className={bem.element('poster')}>
							<Image src={movie?.poster_path} className={bem.element('poster-img')} alt='' />
						</div>
						<div className={bem.element('info')}>
							<div className={bem.element('title-row')}>
								<div className={bem.element('title-block')}>
									<h1 className={bem.element('info-header')}>{movie?.name}</h1>
									{!!movie?.original_name && movie?.original_name !== movie?.name && (
										<div className={bem.element('info-subheader')}>{movie?.original_name}</div>
									)}
								</div>
								<ScoreBlock score={movie?.score} text='TMDB score' className={bem.element('info-score')} />
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

							<div className={bem.element('actions')}>
								<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
									<div className={bem.element('actions-group')}>
										<div className={bem.element('actions-rating')}>
										<Rating
											initialRating={userRate}
											readonly={!user || (userStatus === "Не смотрел")}
											onChange={(score) => {
												setUserRate(score);
												setMovieStatus({ score: score });
											}}
											className={bem.element('rating')}
										/>
										</div>
										<div className={bem.element('actions-statuses')}>
										<StatusButtonGroup
											statuses={["Не смотрел", "Буду смотреть", "Дропнул", "Посмотрел"]}
											className={bem.element('info-statuses')}
											userStatus={userStatus}
											onChangeStatus={(status) => {
												if (!user) {
													dispatch(openModal(LoginForm));
												} else {
													setUserStatus(status);
													setMovieStatus({ status: status });
													if (status === "Не смотрел") {
														setReview("");
														setUserRate(0);
													}
												}
											}}
										/>
										</div>
									</div>
								</LoadingOverlay>
							</div>
						</div>
					</div>

					{!!movie?.videos?.length && (
						<div className={bem.element('trailers-card')}>
							<h3 className={bem.element('section-title')}>Трейлеры</h3>
							<Carousel
								className={bem.element('trailers')}
								showArrows
								centerMode
								centerSlidePercentage={50}
								showThumbs={false}
								showStatus={false}
								showIndicators={false}
							>
						{movie?.videos?.map(renderVideo)}
							</Carousel>
						</div>
					)}

					<div className={bem.element('overview')}>
						<div className={bem.element('content-grid')}>
							<div className={bem.element('main-column')}>
								<section className={bem.element('content-card', {description: true})}>
									<h3 className={bem.element('overview-header')}>Описание</h3>
									<div
										className={bem.element('overview-content', {
											collapsed: canCollapseOverview && !isOverviewExpanded,
										})}
										dangerouslySetInnerHTML={{ __html: movie?.overview }}
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

								<section className={bem.element('content-card', {review: true})} hidden={!user}>
									<h3 className={bem.element('review-header')}>Отзыв</h3>
									<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
										<div className={bem.element('review-body')} hidden={!user}>
											<TextField
												label={__('Ваш отзыв')}
												value={review}
												onChange={(value) => setReview(value)}
											/>
											<Button
												label={__('Сохранить')}
												className={bem.element('button')}
												disabled={!user || (userStatus === "Не смотрел")}
												onClick={() => {
													setMovieStatus({
														review: review,
													}).then(() => {
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
											Никто из друзей ещё не смотрел этот фильм
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
