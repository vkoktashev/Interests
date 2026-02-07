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
	const bem = useBem('movie-page')
	const user = useSelector(getUser);
	const dispatch = useDispatch();
	const {http} = useComponents();
	const movieId = useSelector(state => getRouteParam(state, 'movieId'));
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);

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
		<div className='movie-page__trailer' key={video.url}>
			<ReactPlayer url={video.url} controls key={index} className='movie-page__trailer-player' />
		</div>
	);

	if (!movie) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<Image
				className='movie-page__background'
				src={movie?.backdrop_path}
			/>
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
				<div className='movie-page__body'>
					<div className='movie-page__header'>
						<div className='movie-page__poster'>
							<Image src={movie?.poster_path} className='movie-page__poster-img' alt='' />
						</div>
						<div className='movie-page__info'>
							<div className='movie-page__info-top'>
								<div className='movie-page__title-block'>
									<h1 className='movie-page__info-header'>{movie?.name}</h1>
									<h5 className='movie-page__info-subheader'>{movie?.original_name}</h5>
								</div>
								<ScoreBlock score={movie?.score} text='TMDB score' className='movie-page__info-score' />
							</div>
							<div className='movie-page__info-body'>
								<p>Дата релиза: {movie?.release_date}</p>
								<p>Продолжительность (мин): {movie?.runtime}</p>
								<p>Жанр: {movie?.genres}</p>
								<p>Компания: {movie?.production_companies}</p>
								<p>Слоган: {movie?.tagline}</p>
								<p>В ролях: {movie?.cast}</p>
								<p>Режиссер: {movie?.directors}</p>
							</div>
							<div className='movie-page__actions'>
								<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
									<div className='movie-page__actions-group'>
										<Rating
											initialRating={userRate}
											readonly={!user || (userStatus === "Не смотрел")}
											onChange={(score) => {
												setUserRate(score);
												setMovieStatus({ score: score });
											}}
											className='movie-page__rating'
										/>
										<StatusButtonGroup
											statuses={["Не смотрел", "Буду смотреть", "Дропнул", "Посмотрел"]}
											className='movie-page__info-statuses'
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
								</LoadingOverlay>
							</div>
						</div>
					</div>
					<Carousel className='movie-page__trailers' showArrows centerMode centerSlidePercentage={50} showThumbs={false} showStatus={false} showIndicators={false}>
						{movie?.videos?.map(renderVideo)}
					</Carousel>
					<div className='movie-page__overview'>
						<div>
							<h3 className='game-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: movie?.overview }} />
						</div>
						<h3 className='movie-page__review-header'>Отзыв</h3>
						<LoadingOverlay active={userInfoIsLoading && !isLoading} spinner text='Загрузка...'>
							<div className='game-page__review-body' hidden={!user}>
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
								}} />
							</div>
						</LoadingOverlay>
						<div className='movie-page__friends' hidden={!user || friendsInfo?.length < 1}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}
