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
	const { movie, movieIsLoading, requestMovie, setMovieStatus, userInfo, friendsInfo, userInfoIsLoading, requestUserInfo } = MovieStore;
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;

	let { id } = useParams();
	const [genres, setGenres] = useState("");
	const [companies, setCompanies] = useState("");
	const [cast, setCast] = useState("");
	const [director, setDirector] = useState("");
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
			setClear();
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
		setClear();
		if (movie.tmdb.genres) {
			let newGenres = "";
			for (let i = 0; i < movie.tmdb.genres.length; i++) {
				newGenres += movie.tmdb.genres[i].name;
				if (i !== movie.tmdb.genres.length - 1) newGenres += ", ";
			}
			setGenres(newGenres);
		}

		if (movie.tmdb.production_companies) {
			let newCompanies = "";
			for (let i = 0; i < movie.tmdb.production_companies.length; i++) {
				newCompanies += movie.tmdb.production_companies[i].name;
				if (i !== movie.tmdb.production_companies.length - 1) newCompanies += ", ";
			}
			setCompanies(newCompanies);
		}

		if (movie.tmdb.cast) {
			let newCast = "";
			let length = movie.tmdb.cast.length > 5 ? 5 : movie.tmdb.cast.length;
			for (let i = 0; i < length; i++) {
				newCast += movie.tmdb.cast[i].name;
				if (i !== length - 1) newCast += ", ";
			}
			setCast(newCast);
		}

		if (movie.tmdb.crew) {
			let newDirector = "";
			for (let i = 0; i < movie.tmdb.crew.length; i++) {
				if (movie.tmdb.crew[i].job === "Director") {
					newDirector = movie.tmdb.crew[i].name;
					break;
				}
			}
			setDirector(newDirector);
		}

		document.title = movie.tmdb.title;
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

	function setClear() {
		setDirector("");
		setCast("");
		setCompanies("");
		setGenres("");
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${"http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + movie.tmdb.backdrop_path})` }} />
			<LoadingOverlay active={movieIsLoading} spinner text='Загрузка...'>
				<div className='movieContentPage'>
					<div className='movieContentHeader'>
						<div className='moviePosterBlock'>
							<img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + movie.tmdb.poster_path} className='img-fluid' alt='' />
						</div>
						<div className='movieInfoBlock'>
							<h1 className='header'>{movie.tmdb.title}</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{movie.tmdb.original_title}</h5>
							<div className='mainInfo'>
								<p>Дата релиза: {movie.tmdb.release_date}</p>
								<p>Продолжительность (мин): {movie.tmdb.runtime}</p>
								<p>Жанр: {genres}</p>
								<p>Компания: {companies}</p>
								<p>Слоган: {movie.tmdb.tagline}</p>
								<p>В ролях: {cast}</p>
								<p>Режиссер: {director}</p>
							</div>
							<LoadingOverlay active={userInfoIsLoading & !movieIsLoading} spinner text='Загрузка...'>
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
							<ScoreBlock score={movie.tmdb.vote_average * 10} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='movieContentBody'>
						<div>
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: movie.tmdb.overview }} />
						</div>
						<div className='movieReviewBody' hidden={!loggedIn}>
							<h3 style={{ paddingTop: "10px" }}>Отзывы</h3>
							<LoadingOverlay active={userInfoIsLoading & !movieIsLoading} spinner text='Загрузка...'>
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
