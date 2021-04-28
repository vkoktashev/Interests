import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";
import ShowStore from "../../store/ShowStore";
import CurrentUserStore from "../../store/CurrentUserStore";

import { MDBIcon } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";

import Rating from "react-rating";
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import SeasonsBlock from "./SeasonsBlock";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
const ShowPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;
	const { saveSettingsState } = CurrentUserStore;
	const { requestShow, show, showState, setShowStatus, requestShowUserInfo, userInfo, friendsInfo, userInfoState, anyError } = ShowStore;

	let { id } = useParams();
	const [review, setReview] = useState("");
	const [userStatus, setUserStatus] = useState("Не смотрел");
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
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
		document.title = show.name;
	}, [show]);

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
			<div className='bg' style={{ backgroundImage: `url(${show.backdrop_path})` }} />
			<LoadingOverlay active={showState === "pending"} spinner text='Загрузка...'>
				<div className='contentPage'>
					<div className='contentHeader'>
						<div className='posterBlock tightPoster'>
							<img src={show.poster_path} className='img-fluid' alt='' />
						</div>
						<div className='infoBlock wideInfo'>
							<h1 className='header'>{show.name}</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{show.original_name}</h5>
							<div className='mainInfo'>
								<p hidden={!show.genres}>Жанр: {show.genres}</p>
								<p hidden={!show.production_companies}>Компания: {show.production_companies}</p>
								<p hidden={!show.first_air_date}>Дата выхода первой серии: {show.first_air_date}</p>
								<p hidden={!show.last_air_date}>Дата выхода последней серии: {show.last_air_date}</p>
								<p hidden={show.episode_runtime === null}>Продолжительность (мин): {show.episode_run_time}</p>
								<p>Количество сезонов: {show.seasons_count}</p>
								<p>Количество серий: {show.episodes_count}</p>
								<p hidden={!show.status}>Статус: {show.status}</p>
							</div>
							<LoadingOverlay active={userInfoState === "pending" && !showState === "pending"} spinner text='Загрузка...'>
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
											setShowStatus({ score: score });
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
											setShowStatus({ status: status });
											if (status === "Не смотрел") {
												setReview("");
												setUserRate(0);
											}
										}
									}}
								/>
							</LoadingOverlay>
							<ScoreBlock score={show.score} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='contentBody'>
						<div>
							<h3>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: show.overview }} />
						</div>
						<div className='showSeasonsBody'>
							<h3 style={{ paddingTop: "15px" }}>Список серий</h3>
							<SeasonsBlock showID={show.id} seasons={show.seasons} userWatchedShow={userStatus !== "Не смотрел"} />
						</div>
						<div className='reviewBody' hidden={!loggedIn}>
							<h3 style={{ paddingTop: "10px" }}>Отзыв</h3>
							<LoadingOverlay active={userInfoState === "pending" && !showState === "pending"} spinner text='Загрузка...'>
								<div className='reviewBlock'>
									Ваш отзыв
									<textarea type='textarea' id='reviewInput' value={review} onChange={(event) => setReview(event.target.value)} />
								</div>
								<button
									className={"saveReviewButton"}
									disabled={!loggedIn | (userStatus === "Не смотрел")}
									onClick={() => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setShowStatus({ review: review });
										}
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div className='friendsBlock' hidden={friendsInfo.length < 1}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default ShowPage;
