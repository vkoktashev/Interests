import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../../../store/AuthStore";
import ShowStore from "../../../../store/ShowStore";
import PagesStore from "../../../../store/PagesStore";

import { toast } from "react-toastify";
import { FaStar, FaRegStar, FaEyeSlash, FaEye } from "react-icons/fa";
import LoadingOverlay from "react-loading-overlay";

import Rating from "react-rating";
import FriendsActivity from "../../../Common/FriendsActivity/FriendsActivity";
import ScoreBlock from "../../../Common/ScoreBlock/ScoreBlock";
import "./episode-page.sass";

/**
 * Основная страница приложения
 */
const EpisodePage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;
	const { requestEpisode, show, showState, setEpisodesStatus, requestEpisodeUserInfo, userInfo, userInfoState, friendsInfo, setStatusState } = ShowStore;

	let history = useHistory();
	let { show_id, season_number, episode_number } = useParams();
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(-1);

	useEffect(
		() => {
			setReview("");
			setUserRate(-1);
			requestEpisode(show_id, season_number, episode_number);
		},
		// eslint-disable-next-line
		[show_id, season_number, episode_number, requestEpisode]
	);

	useEffect(
		() => {
			if (loggedIn) requestEpisodeUserInfo(show_id, season_number, episode_number);
			else {
				setReview("");
				setUserRate(-1);
			}
		},
		// eslint-disable-next-line
		[loggedIn, show_id, season_number, episode_number]
	);

	useEffect(() => {
		document.title = show.show?.tmdb_name + " - " + show.name;
	}, [show]);

	useEffect(
		() => {
			if (userInfo?.review) setReview(userInfo.review);
			else setReview("");

			if (userInfo?.score > -1) setUserRate(userInfo.score);
			else setUserRate(-1);
		},
		// eslint-disable-next-line
		[userInfo]
	);

	useEffect(() => {
		if (showState.startsWith("error:")) toast.error(`Ошибка загрузки! ${showState}`);
	}, [showState]);
	useEffect(() => {
		if (userInfoState.startsWith("error:")) toast.error(`Ошибка загрузки пользовательской информации! ${userInfoState}`);
	}, [userInfoState]);
	useEffect(() => {
		if (setStatusState.startsWith("error:")) toast.error(`Ошибка сохранения! ${setStatusState}`);
	}, [setStatusState]);

	return (
		<div className='episode-page'>
			<div className='episode-page__background' style={{ backgroundImage: `url(${show.show?.tmdb_backdrop_path})` }} />
			<LoadingOverlay active={showState === "pending"} spinner text='Загрузка...'>
				<div className='episode-page__body'>
					<div className='episode-page__header'>
						<div className='episode-page__poster'>
							<img src={show.still_path} className='img-fluid' alt='' />
						</div>
						<div className='episode-page__info'>
							<h1 className='episode-page__info-header'>
								<a
									href={window.location.origin + "/show/" + show_id}
									onClick={(e) => {
										history.push("/show/" + show_id);
										e.preventDefault();
									}}>
									{show.show?.tmdb_name}
								</a>
								{" - " + show.name}
							</h1>
							<h5 className='episode-page__info-subheader'>{show.show?.tmdb_original_name + " - Season " + show.season_number + " - Episode " + show.episode_number}</h5>
							<div className='episode-page__info-body'>
								<p hidden={!show.air_date}>Дата выхода: {show.air_date}</p>
								<a
									href={window.location.origin + "/show/" + show_id + "/season/" + season_number}
									onClick={(e) => {
										history.push("/show/" + show_id + "/season/" + season_number);
										e.preventDefault();
									}}>
									Сезон: {show.season_number}
								</a>
							</div>
							<div hidden={!loggedIn | !userInfo?.user_watched_show}>
								<LoadingOverlay active={userInfoState === "pending" && !showState === "pending"} spinner text='Загрузка...'>
									<Rating
										start={-1}
										stop={10}
										emptySymbol={[<FaEyeSlash />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaRegStar style={{ fontSize: "25px" }} />))}
										fullSymbol={[<FaEye />].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaStar style={{ fontSize: "25px" }} title={n} />))}
										initialRating={userRate}
										onChange={(score) => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setUserRate(score);
												setEpisodesStatus({ episodes: [{ tmdb_id: show.id, score: score }] }, show_id);
											}
										}}
									/>
									<div className='episode-page__review'>
										Ваш отзыв
										<textarea type='textarea' className='episode-page__review-input' value={review} onChange={(event) => setReview(event.target.value)} outline />
									</div>
									<button
										className='episode-page__review-save-button'
										hidden={!loggedIn | !userInfo?.user_watched_show}
										onClick={() => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setEpisodesStatus({ episodes: [{ tmdb_id: show.id, review: review }] }, show_id);
											}
										}}>
										Сохранить
									</button>
								</LoadingOverlay>
							</div>
							<ScoreBlock score={show.score} text='TMDB score' className='episode-page__info-score' />
						</div>
					</div>
					<div className='episode-page__overview'>
						<div>
							<h3>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: show.overview }} />
						</div>
						<div className='episode-page__friends' hidden={friendsInfo.length < 1}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default EpisodePage;
