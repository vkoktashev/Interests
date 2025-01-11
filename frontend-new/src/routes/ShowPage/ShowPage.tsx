import React, {useCallback, useEffect, useMemo, useState} from 'react';
import ReactPlayer from "react-player/youtube";
import { Carousel } from "react-responsive-carousel";
import LoadingOverlay from "react-loading-overlay";
import {useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {Loader} from '@steroidsjs/core/ui/layout';
import {getRouteParams} from '@steroidsjs/core/reducers/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import Rating from '../../shared/Rating';
import StatusButtonGroup from '../../shared/StatusButtonGroup';
import FriendsActivity from '../../shared/FriendsActivity';
import SeasonsBlock from './views/SeasonsBlock';
import ScoreBlock from '../../shared/ScoreBlock';

import "react-responsive-carousel/lib/styles/carousel.min.css";
import "./show-page.scss";
import Image from "../../shared/Image";
import LoginForm from '../../modals/LoginForm';
import {showNotification} from '@steroidsjs/core/actions/notifications';

/**
 * Основная страница приложения
 */
function ShowPage(props) {
    const dispatch = useDispatch();
    const {http} = useComponents();
	const user = useSelector(getUser);
	const { showId } = useSelector(getRouteParams);
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);

    const showFetchConfig = useMemo(() => showId && ({
        url: `/api/shows/show/${showId}/`,
        method: 'get',
    }), [showId]);
    const {data: show, isLoading} = useFetch(showFetchConfig);

    const userInfoFetchConfig = useMemo(() => showId && user && ({
        url: `/api/shows/show/${showId}/user_info/`,
        method: 'get',
    }), [showId]);
    const {data: userInfoResponse, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

    const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
    const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);

    const setShowStatus = useCallback(async (payload) => {
        http.send('PUT', `/api/shows/show/${showId}/`, payload).catch(e => {
            fetchUserInfo();
        });
    }, [showId]);

	useEffect(() => {
        setReview("");
        setUserStatus("Не смотрел");
        setUserRate(0);
    }, [showId]);

	useEffect(() => {
		document.title = show?.name || 'Interests';
	}, [show]);

	useEffect(() => {
        if (userInfo?.status) {
            setReview(userInfo.review);
            setUserStatus(userInfo.status);
            setUserRate(userInfo.score);
        } else {
            setReview("");
            setUserRate(0);
            setUserStatus("Не смотрел");
        }
    }, [userInfo]);

	const renderVideo = (video, index) => (
		<div className='movie-page__trailer' key={video.url}>
			<ReactPlayer url={video.url} controls key={index} className='movie-page__trailer-player' />
		</div>
	);

    if (!show) {
        return <Loader />;
    }

	return (
		<div className='show-page'>
			<div
                className='show-page__background'
                style={{ backgroundImage: `url(${show?.backdrop_path})` }}
            />
			<LoadingOverlay
                active={isLoading}
                spinner
                text='Загрузка...'
            >
				<div className='show-page__body'>
					<div className='show-page__header'>
						<div className='show-page__poster'>
							<Image
                                src={show?.poster_path}
                                className='show-page__poster-img'
                                alt=''
                            />
						</div>
						<div className='show-page__info'>
							<h1 className='show-page__info-header'>
                                {show?.name}
                            </h1>
							<h5 className='show-page__info-subheader'>
                                {show?.original_name}
                            </h5>
							<div className='show-page__info-body'>
								<p hidden={!show?.genres}>
                                    Жанр: {show?.genres}
                                </p>
								<p hidden={!show?.production_companies}>
                                    Компания: {show?.production_companies}
                                </p>
								<p hidden={!show?.first_air_date}>
                                    Дата выхода первой серии: {show?.first_air_date}
                                </p>
								<p hidden={!show?.last_air_date}>
                                    Дата выхода последней серии: {show?.last_air_date}
                                </p>
								<p hidden={!!show?.episode_run_time}>
                                    Продолжительность (мин): {show?.episode_run_time}
                                </p>
								<p>
                                    Количество сезонов: {show?.seasons_count}
                                </p>
								<p>
                                    Количество серий: {show?.episodes_count}
                                </p>
								<p hidden={!show?.status}>
                                    Статус: {show?.status}
                                </p>
							</div>
							<LoadingOverlay
                                active={userInfoIsLoading && !isLoading}
                                spinner
                                text='Загрузка...'
                            >
								<Rating
									initialRating={userRate}
									readonly={!user || (userStatus === "Не смотрел")}
									onChange={(score) => {
										if (!user) {
											dispatch(openModal(LoginForm));
										} else {
											setUserRate(score);
											setShowStatus({ score: score });
										}
									}}
									className='show-page__rating'
								/>
								<StatusButtonGroup
									statuses={["Не смотрел", "Буду смотреть", "Смотрю", "Дропнул", "Посмотрел"]}
									className='show-page__info-statuses'
									userStatus={userStatus}
									onChangeStatus={(status) => {
										if (!user) {
                                            dispatch(openModal(LoginForm));
										} else {
											setUserStatus(status);
											setShowStatus({ status: status });
											if (status === "Не смотрел") {
												setReview("");
												setUserRate(0);
											}
										}
									}}
								/>
							</LoadingOverlay>
							<ScoreBlock
                                score={show?.score}
                                text='TMDB score'
                                className='show-page__info-score'
                            />
						</div>
					</div>
					<Carousel
                        className='movie-page__trailers'
                        showArrows
                        centerMode
                        centerSlidePercentage={50}
                        showThumbs={false}
                        showStatus={false}
                        showIndicators={false}
                    >
						{show?.videos?.map(renderVideo)}
					</Carousel>
					<div className='show-page__overview'>
						<div>
							<h3 className='show-page__overview-header'>
                                Описание
                            </h3>
							<div dangerouslySetInnerHTML={{ __html: show?.overview }} />
						</div>
						<div className='show-page__seasons'>
							<h3 className='show-page__seasons-header'>
                                Список серий
                            </h3>
							<SeasonsBlock
                                showID={show?.id}
                                seasons={show?.seasons}
                                userWatchedShow={userStatus !== "Не смотрел"}
                            />
						</div>
						<div className='show-page__review' hidden={!user}>
							<h3 className='show-page__review-header'>
                                Отзыв
                            </h3>
							<LoadingOverlay
                                active={userInfoIsLoading && !isLoading}
                                spinner
                                text='Загрузка...'
                            >
								<div className='show-page__review'>
									Ваш отзыв
									<textarea
                                        value={review}
                                        onChange={(event) => setReview(event.target.value)}
                                        className='show-page__review-input'
                                    />
								</div>
								<button
									className='show-page__review-save-button'
									disabled={!user || (userStatus === "Не смотрел")}
									onClick={() => {
										if (!user) {
                                            dispatch(openModal(LoginForm));
										} else {
											setShowStatus({ review: review })
                                                .then(() => {
                                                    dispatch(showNotification('Отзыв сохранен!', 'success', {
                                                        position: 'top-right',
                                                        timeOut: 1000,
                                                    }));
                                                });
										}
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div
                            className='show-page__friends'
                            hidden={!user || !friendsInfo?.length}
                        >
							<h4>Отзывы друзей</h4>
							<FriendsActivity
                                info={friendsInfo}
                            />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default ShowPage;
