import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useParams } from "react-router-dom";
import { MDBIcon, MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import "./style.css";

import Rating from "react-rating";
import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";
import FriendsActivity from "../Common/FriendsActivity";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
function EpisodePage({ requestShowEpisode, showEpisode, showEpisodeIsLoading, setEpisodeUserStatus, requestShowEpisodeUserInfo, showUserInfo, showUserInfoIsLoading, loggedIn, openLoginForm }) {
	let history = useHistory();
	let { show_id, season_number, episode_number } = useParams();
	const [date, setDate] = useState("");
	const [review, setReview] = useState("");
	const [userRate, setUserRate] = useState(-1);

	useEffect(
		() => {
			setClear();
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
		setClear();
		if (showEpisode.tmdb.air_date) {
			let mas = showEpisode.tmdb.air_date.split("-");
			let newDate = mas[2] + "." + mas[1] + "." + mas[0];
			setDate(newDate);
		}

		document.title = showEpisode.tmdb.show_name + " - " + showEpisode.tmdb.name;
	}, [showEpisode]);

	useEffect(
		() => {
			if (showUserInfo?.review) setReview(showUserInfo.review);
			else setReview("");

			if (showUserInfo?.score) setUserRate(showUserInfo.score);
			else setUserRate(-1);
		},
		// eslint-disable-next-line
		[showUserInfo]
	);

	function setClear() {
		setDate("");
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${"http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + showEpisode.tmdb.backdrop_path})` }} />
			<LoadingOverlay active={showEpisodeIsLoading} spinner text='Загрузка...'>
				<div className='showContentPage'>
					<div className='showContentHeader'>
						<div className='showPosterBlock'>
							<img src={"http://image.tmdb.org/t/p/w600_and_h900_bestv2" + showEpisode.tmdb.still_path} className='img-fluid' alt='' />
						</div>
						<div className='showInfoBlock'>
							<h1 className='header'>
								<a
									href={window.location.origin + "/show/" + show_id}
									onClick={(e) => {
										history.push("/show/" + show_id);
										e.preventDefault();
									}}>
									{showEpisode.tmdb.show_name}
								</a>
								{" - " + showEpisode.tmdb.name}
							</h1>
							<h5 style={{ marginBottom: "10px", marginTop: "-10px" }}>
								{showEpisode.tmdb.show_original_name + " - Season " + showEpisode.tmdb.season_number + " - Episode " + showEpisode.tmdb.episode_number}{" "}
							</h5>
							<div className='mainInfo'>
								<p hidden={date === ""}>Дата выхода: {date}</p>
								<a
									href={window.location.origin + "/show/" + show_id + "/season/" + season_number}
									onClick={(e) => {
										history.push("/show/" + show_id + "/season/" + season_number);
										e.preventDefault();
									}}>
									Сезон: {showEpisode.tmdb.season_number}
								</a>
							</div>
							<div hidden={!loggedIn | !showUserInfo?.user_watched_show}>
								<LoadingOverlay active={showUserInfoIsLoading & !showEpisodeIsLoading} spinner text='Загрузка...'>
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
												setEpisodeUserStatus({ episodes: [{ season_number: season_number, episode_number: episode_number, score: score }] }, show_id);
											}
										}}
									/>
									<MDBInput type='textarea' id='reviewSeasonInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
									<button
										className={"savePreviewButton"}
										hidden={!loggedIn | !showUserInfo?.user_watched_show}
										onClick={() => {
											if (!loggedIn) {
												openLoginForm();
											} else {
												setEpisodeUserStatus(
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
							<ScoreBlock score={showEpisode.tmdb.vote_average * 10} text='TMDB score' className='scoreBlock' />
						</div>
					</div>
					<div className='showContentBody'>
						<div>
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: showEpisode.tmdb.overview }} />
						</div>
						<div className='movieFriendsBlock' hidden={showUserInfo.friends_info.length < 1}>
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
	showEpisode: selectors.getContentShow(state),
	showEpisodeIsLoading: selectors.getIsLoadingContentShow(state),
	showUserInfo: selectors.getContentShowUserInfo(state),
	showUserInfoIsLoading: selectors.getIsLoadingContentShowUserInfo(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestShowEpisode: (showID, seasonNumber, episodeNumber) => {
			dispatch(actions.requestShowEpisode(showID, seasonNumber, episodeNumber));
		},
		setEpisodeUserStatus: (status, showID) => {
			dispatch(actions.setShowEpisodesStatus(status, showID));
		},
		openLoginForm: () => {
			dispatch(actions.openLoginForm());
		},
		requestShowEpisodeUserInfo: (showID, seasonID, episodeID) => {
			dispatch(actions.requestShowEpisodeUserInfo(showID, seasonID, episodeID));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(EpisodePage);
