import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "store/AuthStore";
import PagesStore from "store/PagesStore";
import ShowStore from "store/ShowStore";
import CurrentUserStore from "store/CurrentUserStore";

import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";

import Rating from "components/Common/Rating/Rating";
import StatusButtonGroup from "components/Common/StatusButtonGroup/StatusButtonGroup";
import FriendsActivity from "components/Common/FriendsActivity/FriendsActivity";
import SeasonsBlock from "../../Blocks/SeasonsBlock/SeasonsBlock";
import ScoreBlock from "components/Common/ScoreBlock/ScoreBlock";

import "./show-page.sass";

/**
 * Основная страница приложения
 */
const ShowPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;
	const { saveSettingsState } = CurrentUserStore;
	const { requestShow, show, showState, setShowStatus, setShowReview, requestShowUserInfo, userInfo, friendsInfo, userInfoState, anyError } = ShowStore;

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
		<div className='show-page'>
			<div className='show-page__background' style={{ backgroundImage: `url(${show.backdrop_path})` }} />
			<LoadingOverlay active={showState === "pending"} spinner text='Загрузка...'>
				<div className='show-page__body'>
					<div className='show-page__header'>
						<div className='show-page__poster'>
							<img src={show.poster_path} className='show-page__poster-img' alt='' />
						</div>
						<div className='show-page__info'>
							<h1 className='show-page__info-header'>{show.name}</h1>
							<h5 className='show-page__info-subheader'>{show.original_name}</h5>
							<div className='show-page__info-body'>
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
									className='show-page__rating'
								/>
								<StatusButtonGroup
									loggedIn={loggedIn}
									statuses={["Не смотрел", "Буду смотреть", "Смотрю", "Дропнул", "Посмотрел"]}
									className='show-page__info-statuses'
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
							<ScoreBlock score={show.score} text='TMDB score' className='show-page__info-score' />
						</div>
					</div>
					<div className='show-page__overview'>
						<div>
							<h3 className='show-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: show.overview }} />
						</div>
						<div className='show-page__seasons'>
							<h3 className='show-page__seasons-header'>Список серий</h3>
							<SeasonsBlock showID={show.id} seasons={show.seasons} userWatchedShow={userStatus !== "Не смотрел"} />
						</div>
						<div className='show-page__review' hidden={!loggedIn}>
							<h3 className='show-page__review-header'>Отзыв</h3>
							<LoadingOverlay active={userInfoState === "pending" && !showState === "pending"} spinner text='Загрузка...'>
								<div className='show-page__review'>
									Ваш отзыв
									<textarea type='textarea' value={review} onChange={(event) => setReview(event.target.value)} className='show-page__review-input' />
								</div>
								<button
									className='show-page__review-save-button'
									disabled={!loggedIn | (userStatus === "Не смотрел")}
									onClick={() => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setShowReview({ review: review });
										}
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div className='show-page__friends' hidden={!loggedIn || friendsInfo.length < 1}>
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
