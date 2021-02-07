import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MDBIcon, MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import "./style.css";

import Rating from "react-rating";
import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import SeasonsBlock from "./SeasonsBlock";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
function ShowPage({ requestShow, show, showIsLoading, setShowUserStatus, setShowEpisodeUserStatus, requestShowUserInfo, showUserInfo, showUserInfoIsLoading, loggedIn, openLoginForm }) {
	let { id } = useParams();
	const [genres, setGenres] = useState("");
	const [companies, setCompanies] = useState("");
	const [showStatus, setShowStatus] = useState("");
	const [firstDate, setFirstDate] = useState("");
	const [lastDate, setLastDate] = useState("");
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
			setClear();
			setReview("");
			setUserStatus("Не смотрел");
			setUserRate(0);
			requestShow(id);
		},
		// eslint-disable-next-line
		[id, requestShow]
	);

	useEffect(
		() => {
			if (loggedIn) requestShowUserInfo(id);
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
		if (show.tmdb.genres) {
			let newGenres = "";
			for (let i = 0; i < show.tmdb.genres.length; i++) {
				newGenres += show.tmdb.genres[i].name;
				if (i !== show.tmdb.genres.length - 1) newGenres += ", ";
			}
			setGenres(newGenres);
		}

		if (show.tmdb.production_companies) {
			let newCompanies = "";
			for (let i = 0; i < show.tmdb.production_companies.length; i++) {
				newCompanies += show.tmdb.production_companies[i].name;
				if (i !== show.tmdb.production_companies.length - 1) newCompanies += ", ";
			}
			setCompanies(newCompanies);
		}

		switch (show.tmdb.status) {
			case "Ended":
				setShowStatus("Окончен");
				break;
			case "Returning Series":
				setShowStatus("Продолжается");
				break;
			case "Pilot":
				setShowStatus("Пилот");
				break;
			case "Canceled":
				setShowStatus("Отменен");
				break;
			case "In Production":
				setShowStatus("В производстве");
				break;
			case "Planned":
				setShowStatus("Запланирован");
				break;
			default:
				setShowStatus(show.tmdb.status);
		}

		if (show.tmdb.first_air_date) {
			let mas = show.tmdb.first_air_date.split("-");
			let newDate = mas[2] + "." + mas[1] + "." + mas[0];
			setFirstDate(newDate);
		}

		if (show.tmdb.last_air_date) {
			let mas = show.tmdb.last_air_date.split("-");
			let newDate = mas[2] + "." + mas[1] + "." + mas[0];
			setLastDate(newDate);
		}

		document.title = show.tmdb.name;
	}, [show]);

	useEffect(
		() => {
			if (showUserInfo?.status) {
				setReview(showUserInfo.review);
				setUserStatus(showUserInfo.status);
				setUserRate(showUserInfo.score);
			} else {
				setReview("");
				setUserRate(0);
				setUserStatus("Не смотрел");
			}
		},
		// eslint-disable-next-line
		[showUserInfo]
	);

	function setClear() {
		setLastDate("");
		setFirstDate("");
		setShowStatus("");
		setCompanies("");
		setGenres("");
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${"http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + show.tmdb.backdrop_path})` }} />
			<LoadingOverlay active={showIsLoading} spinner text='Загрузка...'>
				<div className='showContentPage'>
					<div className='showContentHeader'>
						<div className='showPosterBlock'>
							<img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb.poster_path} className='img-fluid' alt='' />
						</div>
						<div className='showInfoBlock'>
							<h1 className='header'>{show.tmdb.name}</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{show.tmdb.original_name}</h5>
							<div className='mainInfo'>
								<p>Жанр: {genres}</p>
								<p>Компания: {companies}</p>
								<p hidden={firstDate === ""}>Дата выхода первой серии: {firstDate}</p>
								<p hidden={lastDate === ""}>Дата выхода последней серии: {lastDate}</p>
								<p hidden={show.tmdb.episode_run_time ? false : true}>Продолжительность (мин): {show.tmdb.episode_run_time ? show.tmdb.episode_run_time[0] : 0}</p>
								<p>Количество сезонов: {show.tmdb.number_of_seasons}</p>
								<p>Количество серий: {show.tmdb.number_of_episodes}</p>
								<p>Статус: {showStatus}</p>
							</div>
							<LoadingOverlay active={showUserInfoIsLoading & !showIsLoading} spinner text='Загрузка...'>
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
											setShowUserStatus({ score: score });
										}
									}}
								/>{" "}
								<br />
								<StatusButtonGroup
									loggedIn={loggedIn}
									statuses={["Не смотрел", "Буду смотреть", "Смотрю", "Дропнул", "Посмотрел"]}
									activeColor='#4527a0'
									userStatus={userStatus}
									onChangeStatus={(status) => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setUserStatus(status);
											setShowUserStatus({ status: status });
											if (status === "Не смотрел") {
												setReview("");
												setUserRate(0);
											}
										}
									}}
								/>
							</LoadingOverlay>
							<ScoreBlock score={show.tmdb.vote_average * 10} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='showContentBody'>
						<div>
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: show.tmdb.overview }} />
						</div>
						<div className='showSeasonsBody'>
							<h3 style={{ paddingTop: "15px" }}>Список серий</h3>
							<SeasonsBlock showID={show.tmdb.id} seasons={show.tmdb.seasons} setShowEpisodeUserStatus={setShowEpisodeUserStatus} userWatchedShow={userStatus !== "Не смотрел"} />
						</div>
						<div className='showReviewBody' hidden={!loggedIn}>
							<h3 style={{ paddingTop: "10px" }}>Отзывы</h3>
							<LoadingOverlay active={showUserInfoIsLoading & !showIsLoading} spinner text='Загрузка...'>
								<MDBInput type='textarea' id='reviewInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
								<button
									className={"savePreviewButton"}
									disabled={!loggedIn | (userStatus === "Не смотрел")}
									onClick={() => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setShowUserStatus({ review: document.getElementById("reviewInput").value });
										}
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div className='showFriendsBlock' hidden={showUserInfo.friends_info.length < 1}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={showUserInfo.friends_info} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	requestError: selectors.getShowRequestError(state),
	show: selectors.getContentShow(state),
	showIsLoading: selectors.getIsLoadingContentShow(state),
	showUserInfo: selectors.getContentShowUserInfo(state),
	showUserInfoIsLoading: selectors.getIsLoadingContentShowUserInfo(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShow: (id) => {
			dispatch(actions.requestShow(id));
		},
		setShowUserStatus: (status) => {
			dispatch(actions.setShowStatus(status));
		},
		openLoginForm: () => {
			dispatch(actions.openLoginForm());
		},
		requestShowUserInfo: (id) => {
			dispatch(actions.requestShowUserInfo(id));
		},
		setShowEpisodeUserStatus: (status, showID) => {
			dispatch(actions.setShowEpisodesStatus(status, showID, true));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ShowPage);
