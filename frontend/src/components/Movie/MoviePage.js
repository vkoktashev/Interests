import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import MovieStore from "../../store/MovieStore";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";
import CurrentUserStore from "../../store/CurrentUserStore";

import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";

import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import ScoreBlock from "../Common/ScoreBlock";
import Rating from "../Common/Rating";

/**
 * Основная страница приложения
 */
const MoviePage = observer((props) => {
	const { movie, movieState, requestMovie, setMovieStatus, userInfo, friendsInfo, userInfoState, requestUserInfo, anyError } = MovieStore;
	const { loggedIn } = AuthStore;
	const { saveSettingsState } = CurrentUserStore;
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
	useEffect(() => {
		if (saveSettingsState.startsWith("error:")) toast.error(`Ошибка фона! ${saveSettingsState}`);
		else if (saveSettingsState === "saved") toast.success(`Фон установлен!`);
	}, [saveSettingsState]);

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${movie.backdrop_path})` }} />
			<LoadingOverlay active={movieState === "pending"} spinner text='Загрузка...'>
				<div className='contentPage'>
					<div className='contentHeader'>
						<div className='posterBlock tightPoster'>
							<img src={movie.poster_path} className='img-fluid' alt='' />
						</div>
						<div className='infoBlock wideInfo'>
							<h1 className='header'>{movie.name}</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{movie.original_name}</h5>
							<div className='mainInfo'>
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
									size='1.5rem'
								/>
								<StatusButtonGroup
									statuses={["Не смотрел", "Буду смотреть", "Дропнул", "Посмотрел"]}
									activeColor='#4527a0'
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
							<ScoreBlock score={movie.score} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='contentBody'>
						<div>
							<h3>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: movie.overview }} />
						</div>
						<div className='reviewBody' hidden={!loggedIn}>
							<h3 style={{ paddingTop: "10px" }}>Отзыв</h3>
							<LoadingOverlay active={userInfoState === "pending" && !movieState === "pending"} spinner text='Загрузка...'>
								<div className='reviewBlock'>
									Ваш отзыв
									<textarea type='textarea' id='reviewInput' value={review} onChange={(event) => setReview(event.target.value)} />
								</div>
								<button
									className={"saveReviewButton"}
									disabled={!loggedIn | (userStatus === "Не смотрел")}
									onClick={() => {
										setMovieStatus({ review: review });
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div className='friendsBlock' hidden={!loggedIn | (friendsInfo?.length < 1)}>
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
