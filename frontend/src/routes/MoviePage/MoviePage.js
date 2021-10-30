import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactPlayer from "react-player/youtube";
import { Carousel } from "react-responsive-carousel";
import { observer } from "mobx-react";
import MovieStore from "store/MovieStore";
import AuthStore from "store/AuthStore";
import PagesStore from "store/PagesStore";

import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";

import StatusButtonGroup from "shared/StatusButtonGroup";
import FriendsActivity from "shared/FriendsActivity";
import ScoreBlock from "shared/ScoreBlock";
import Rating from "shared/Rating";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import "./movie-page.sass";

/**
 * Основная страница приложения
 */
const MoviePage = observer((props) => {
	const { movie, movieState, requestMovie, setMovieStatus, setMovieReview, userInfo, friendsInfo, userInfoState, requestUserInfo, anyError } = MovieStore;
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;

	let { id } = useParams();
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
			setReview("");
			setUserStatus("Не смотрел");
			setUserRate(0);
			requestMovie(id);
		},
		// eslint-disable-next-line
		[id, requestMovie]
	);

	useEffect(
		() => {
			if (loggedIn) requestUserInfo(id);
			else {
				setReview("");
				setUserRate(0);
				setUserStatus("Не смотрел");
			}
		},
		// eslint-disable-next-line
		[loggedIn, id]
	);

	useEffect(() => {
		document.title = movie.name;
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

	useEffect(() => {
		if (anyError) toast.error(anyError);
	}, [anyError]);

	const renderVideo = (video, index) => (
		<div className='movie-page__trailer'>
			<ReactPlayer url={video.url} controls key={index} className='movie-page__trailer-player' />
		</div>
	);

	return (
		<div className='movie-page'>
			<div className='movie-page__background' style={{ backgroundImage: `url(${movie.backdrop_path})` }} />
			<LoadingOverlay active={movieState === "pending"} spinner text='Загрузка...'>
				<div className='movie-page__body'>
					<div className='movie-page__header'>
						<div className='movie-page__poster'>
							<img src={movie.poster_path} className='movie-page__poster-img' alt='' />
						</div>
						<div className='movie-page__info'>
							<h1 className='movie-page__info-header'>{movie.name}</h1>
							<h5 className='movie-page__info-subheader'>{movie.original_name}</h5>
							<div className='movie-page__info-body'>
								<p>Дата релиза: {movie.release_date}</p>
								<p>Продолжительность (мин): {movie.runtime}</p>
								<p>Жанр: {movie.genres}</p>
								<p>Компания: {movie.production_companies}</p>
								<p>Слоган: {movie.tagline}</p>
								<p>В ролях: {movie.cast}</p>
								<p>Режиссер: {movie.directors}</p>
							</div>
							<LoadingOverlay active={userInfoState === "pending" && !movieState === "pending"} spinner text='Загрузка...'>
								<Rating
									initialRating={userRate}
									readonly={!loggedIn | (userStatus === "Не смотрел")}
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
										if (!loggedIn) {
											openLoginForm();
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
							</LoadingOverlay>
							<ScoreBlock score={movie.score} text='TMDB score' className='movie-page__info-score' />
						</div>
					</div>
					<Carousel className='movie-page__trailers' showArrows centerMode centerSlidePercentage={50} showThumbs={false} showStatus={false} showIndicators={false}>
						{movie?.videos?.map(renderVideo)}
					</Carousel>
					<div className='movie-page__overview'>
						<div>
							<h3 className='game-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: movie.overview }} />
						</div>
						<h3 className='movie-page__review-header'>Отзыв</h3>
						<LoadingOverlay active={userInfoState === "pending" && !movieState === "pending"} spinner text='Загрузка...'>
							<div className='game-page__review-body' hidden={!loggedIn}>
								<div className='movie-page__review'>
									Ваш отзыв
									<textarea type='textarea' className='movie-page__review-input' value={review} onChange={(event) => setReview(event.target.value)} />
								</div>
								<button
									className='movie-page__review-save-button'
									disabled={!loggedIn | (userStatus === "Не смотрел")}
									onClick={() => {
										setMovieReview({ review: review });
									}}>
									Сохранить
								</button>
							</div>
						</LoadingOverlay>
						<div className='movie-page__friends' hidden={!loggedIn || friendsInfo?.length < 1}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default MoviePage;
