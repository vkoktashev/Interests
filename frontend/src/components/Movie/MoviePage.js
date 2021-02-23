import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import MovieStore from "../../store/MovieStore";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";

import { MDBIcon, MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import "./style.css";

import Rating from "react-rating";
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
const MoviePage = observer((props) => {
	const { movie, movieState, requestMovie, setMovieStatus, userInfo, friendsInfo, userInfoState, requestUserInfo } = MovieStore;
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

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${movie.background})` }} />
			<LoadingOverlay active={movieState === "pending"} spinner text='Загрузка...'>
				<div className='movieContentPage'>
					<div className='movieContentHeader'>
						<div className='moviePosterBlock'>
							<img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + movie.poster} className='img-fluid' alt='' />
						</div>
						<div className='movieInfoBlock'>
							<h1 className='header'>{movie.name}</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{movie.originalName}</h5>
							<div className='mainInfo'>
								<p>Дата релиза: {movie.date}</p>
								<p>Продолжительность (мин): {movie.runtime}</p>
								<p>Жанр: {movie.genres}</p>
								<p>Компания: {movie.companies}</p>
								<p>Слоган: {movie.tagline}</p>
								<p>В ролях: {movie.cast}</p>
								<p>Режиссер: {movie.director}</p>
							</div>
							<LoadingOverlay active={userInfoState === "pending" && !movieState === "pending"} spinner text='Загрузка...'>
								<Rating
									stop={10}
									emptySymbol={<MDBIcon far icon='star' size='1x' style={{ fontSize: "25px" }} />}
									fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
										<MDBIcon icon='star' size='1x' style={{ fontSize: "25px" }} title={n} />
									))}
									initialRating={userRate}
									readonly={!loggedIn | (userStatus === "Не смотрел")}
									onChange={(score) => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setUserRate(score);
											setMovieStatus({ score: score });
										}
									}}
								/>{" "}
								<br />
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
							<ScoreBlock score={movie.tmdbScore} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='movieContentBody'>
						<div>
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: movie.overview }} />
						</div>
						<div className='movieReviewBody' hidden={!loggedIn}>
							<h3 style={{ paddingTop: "10px" }}>Отзывы</h3>
							<LoadingOverlay active={userInfoState === "pending" && !movieState === "pending"} spinner text='Загрузка...'>
								<MDBInput type='textarea' id='reviewInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
								<button
									className={"savePreviewButton"}
									disabled={!loggedIn | (userStatus === "Не смотрел")}
									onClick={() => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setMovieStatus({ review: document.getElementById("reviewInput").value });
										}
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div className='movieFriendsBlock' hidden={!loggedIn | (friendsInfo?.length < 1)}>
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
