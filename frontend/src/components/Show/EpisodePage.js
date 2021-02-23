import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import ShowStore from "../../store/ShowStore";
import PagesStore from "../../store/PagesStore";

import { MDBIcon, MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import "./style.css";

import Rating from "react-rating";
import FriendsActivity from "../Common/FriendsActivity";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
const EpisodePage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;
	const { requestShowEpisode, show, showIsLoading, setShowEpisodesStatus, requestShowEpisodeUserInfo, userInfo, userInfoIsLoading, friendsInfo } = ShowStore;

	let history = useHistory();
	let { show_id, season_number, episode_number } = useParams();
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(-1);

	useEffect(
		() => {
			setReview("");
			setUserRate(-1);
			requestShowEpisode(show_id, season_number, episode_number);
		},
		// eslint-disable-next-line
		[show_id, season_number, episode_number, requestShowEpisode]
	);

	useEffect(
		() => {
			if (loggedIn) requestShowEpisodeUserInfo(show_id, season_number, episode_number);
			else {
				setReview("");
				setUserRate(-1);
			}
		},
		// eslint-disable-next-line
		[loggedIn, show_id, season_number, episode_number]
	);

	useEffect(() => {
		document.title = show.showName + " - " + show.name;
	}, [show]);

	useEffect(
		() => {
			if (userInfo?.review) setReview(userInfo.review);
			else setReview("");

			if (userInfo?.score) setUserRate(userInfo.score);
			else setUserRate(-1);
		},
		// eslint-disable-next-line
		[userInfo]
	);

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${show.background})` }} />
			<LoadingOverlay active={showIsLoading} spinner text='Загрузка...'>
				<div className='showContentPage'>
					<div className='showContentHeader'>
						<div className='showPosterBlock'>
							<img src={show.poster} className='img-fluid' alt='' />
						</div>
						<div className='showInfoBlock'>
							<h1 className='header'>
								<a
									href={window.location.origin + "/show/" + show_id}
									onClick={(e) => {
										history.push("/show/" + show_id);
										e.preventDefault();
									}}>
									{show.showName}
								</a>
								{" - " + show.name}
							</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>{show.showOriginalName + " - Season " + show.seasonNumber + " - Episode " + show.episodeNumber}</h5>
							<div className='mainInfo'>
								<p hidden={!show.date}>Дата выхода: {show.date}</p>
								<a
									href={window.location.origin + "/show/" + show_id + "/season/" + season_number}
									onClick={(e) => {
										history.push("/show/" + show_id + "/season/" + season_number);
										e.preventDefault();
									}}>
									Сезон: {show.seasonNumber}
								</a>
							</div>
							<div hidden={!loggedIn | !userInfo?.user_watched_show}>
								<LoadingOverlay active={userInfoIsLoading && !showIsLoading} spinner text='Загрузка...'>
									<Rating
										start={-1}
										stop={10}
										emptySymbol={[<MDBIcon icon='eye-slash' />].concat(
											[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon far icon='star' size='1x' style={{ fontSize: "25px" }} />)
										)}
										fullSymbol={[<MDBIcon icon='eye' />].concat(
											[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <MDBIcon icon='star' size='1x' style={{ fontSize: "25px" }} title={n} />)
										)}
										initialRating={userRate}
										onChange={(score) => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setUserRate(score);
												setShowEpisodesStatus({ episodes: [{ season_number: season_number, episode_number: episode_number, score: score }] }, show_id);
											}
										}}
									/>
									<MDBInput type='textarea' id='reviewSeasonInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
									<button
										className={"savePreviewButton"}
										hidden={!loggedIn | !userInfo?.user_watched_show}
										onClick={() => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setShowEpisodesStatus(
													{
														episodes: [
															{
																season_number: season_number,
																episode_number: episode_number,
																review: document.getElementById("reviewSeasonInput").value,
															},
														],
													},
													show_id
												);
											}
										}}>
										Сохранить
									</button>
								</LoadingOverlay>
							</div>
							<ScoreBlock score={show.tmdbScore} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='showContentBody'>
						<div>
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: show.overview }} />
						</div>
						<div className='movieFriendsBlock' hidden={friendsInfo.length < 1}>
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
