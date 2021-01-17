import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MDBRow, MDBCol, MDBContainer, MDBIcon, MDBInput } from "mdbreact";
import "./style.css";
import LoadingOverlay from "react-loading-overlay";

import Rating from "react-rating";
import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";

/**
 * Основная страница приложения
 */
function GamePage({ requestGame, openLoginForm, setGameStatus, requestGameUserInfo, loggedIn, game, gameIsLoading, gameUserInfo, gameUserInfoIsLoading }) {
	let { id } = useParams();
	const [genres, setGenres] = useState("");
	const [metascoreBlock, setMetascoreBlock] = useState("");
	const [review, setReview] = useState("");
	const [spentTime, setSpentTime] = useState(0);
	const [userStatus, setUserStatus] = useState("Не играл");
	const [userRate, setUserRate] = useState(0);
	const [developers, setDevelopers] = useState("");
	const [date, setDate] = useState("");
	const [hltbInfo, setHtlbInfo] = useState({ gameplay_main_extra: -1, gameplay_main: -1, gameplay_comletionist: -1 });

	useEffect(
		() => {
			setClear();
			setReview("");
			setSpentTime(0);
			setUserStatus("Не играл");
			setUserRate(0);
			requestGame(id);
		},
		// eslint-disable-next-line
		[id, requestGame]
	);

	useEffect(
		() => {
			if (loggedIn) requestGameUserInfo(id);
			else {
				setReview("");
				setSpentTime("0");
				setUserStatus("Не играл");
				setUserRate(0);
			}
		},
		// eslint-disable-next-line
		[id, loggedIn]
	);

	useEffect(() => {
		setClear();
		if (game.rawg.genres) {
			let newGenres = "";
			for (let i = 0; i < game.rawg.genres.length; i++) {
				newGenres += game.rawg.genres[i].name;
				if (i !== game.rawg.genres.length - 1) newGenres += ", ";
			}
			setGenres(newGenres);
		}

		if (game.rawg.metacritic) {
			setMetascoreBlock(
				<div>
					<div className='metacritic'>
						<p>{game.rawg.metacritic}</p>
					</div>
					<p className='metacriticText'>Metascore</p>
				</div>
			);
		}

		if (game.hltb) {
			setHtlbInfo(game.hltb);
		} else if (game.rawg.playtime) {
			setHtlbInfo({ gameplay_main_extra: game.rawg.playtime, gameplay_main: -1, gameplay_completionist: -1 });
		}

		if (game.rawg.developers) {
			let newDevelopers = "";
			for (let i = 0; i < game.rawg.developers.length; i++) {
				newDevelopers += game.rawg.developers[i].name;
				if (i !== game.rawg.developers.length - 1) newDevelopers += ", ";
			}
			setDevelopers(newDevelopers);
		}

		if (game.rawg.released) {
			let mas = game.rawg.released.split("-");
			let newDate = mas[2] + "." + mas[1] + "." + mas[0];
			setDate(newDate);
		}

		document.title = game.rawg.name;
	}, [game]);

	useEffect(
		() => {
			if (gameUserInfo?.status) {
				setReview(gameUserInfo.review);
				setSpentTime(gameUserInfo.spent_time);
				setUserStatus(gameUserInfo.status);
				setUserRate(gameUserInfo.score);
			} else {
				setReview("");
				setSpentTime(0);
				setUserStatus("Не играл");
				setUserRate(0);
			}
		},
		// eslint-disable-next-line
		[gameUserInfo]
	);

	function setClear() {
		setGenres("");
		setMetascoreBlock("");
		setHtlbInfo({ gameplay_main_extra: -1, gameplay_main: -1, gameplay_completionist: -1 });
		setDevelopers("");
		setDate("");
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${game.rawg.background_image_additional ? game.rawg.background_image_additional : game.rawg.background_image})` }} />
			<LoadingOverlay active={gameIsLoading} spinner text='Загрузка...'>
				<MDBContainer>
					<MDBRow>
						<MDBCol md='0.5'></MDBCol>
						<MDBCol className='gameContentPage'>
							<MDBContainer>
								<MDBRow className='gameContentHeader rounded-top'>
									<MDBCol size='5' className='posterBlock'>
										<img src={game.rawg.background_image} className='img-fluid' alt='' />
									</MDBCol>
									<MDBCol size='6'>
										<h1>{game.rawg.name}</h1>
										<div className='mainInfo'>
											<p>Разработчики: {developers}</p>
											<p>Дата релиза: {date}</p>
											<p>Жанр: {genres}</p>
											<p style={{ display: "inline" }}>Время прохождения: </p>
											<div hidden={hltbInfo.gameplay_main < 0} style={{ display: "inline" }}>
												<MDBIcon far icon='clock' className='light-green-text' title={"Главный сюжет"} />
												<span className='hs' />
												{hltbInfo.gameplay_main} {hltbInfo.gameplay_main_unit}
												<span className='hs' />
											</div>{" "}
											<p style={{ display: "inline" }}> </p>
											<div hidden={hltbInfo.gameplay_main_extra < 0} style={{ display: "inline" }}>
												<MDBIcon far icon='clock' className='yellow-text' title={"Главный сюжет + побочные задания"} />
												<span className='hs' />
												{hltbInfo.gameplay_main_extra} {hltbInfo.gameplay_main_extra_unit}
												<span className='hs' />
											</div>{" "}
											<p style={{ display: "inline" }}> </p>
											<div hidden={hltbInfo.gameplay_completionist < 0} style={{ display: "inline" }}>
												<MDBIcon far icon='clock' className='red-text' title={"Полное прохождение"} />
												<span className='hs' />
												{hltbInfo.gameplay_completionist} {hltbInfo.gameplay_completionist_unit}
											</div>
										</div>
										<LoadingOverlay active={gameUserInfoIsLoading} spinner text='Загрузка...'>
											<Rating
												stop={10}
												emptySymbol={<MDBIcon far icon='star' size='1x' style={{ fontSize: "25px" }} />}
												fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
													<MDBIcon icon='star' size='1x' style={{ fontSize: "25px" }} title={n} />
												))}
												initialRating={userRate}
												readonly={!loggedIn | (userStatus === "Не играл")}
												onChange={(score) => {
													if (!loggedIn) {
														openLoginForm();
													} else {
														setUserRate(score);
														setGameStatus({ score: score });
													}
												}}
												style={{ marginBottom: "10px" }}
											/>{" "}
											<br />
											<StatusButtonGroup
												statuses={["Не играл", "Буду играть", "Играю", "Дропнул", "Прошел"]}
												activeColor='#4527a0'
												userStatus={userStatus}
												onChangeStatus={(status) => {
													if (!loggedIn) {
														openLoginForm();
													} else {
														setUserStatus(status);
														setGameStatus({ status: status });
														if (status === "Не играл") {
															setReview("");
															setUserRate(0);
														}
													}
												}}
											/>
										</LoadingOverlay>
									</MDBCol>
									<MDBCol size='1'>{metascoreBlock}</MDBCol>
								</MDBRow>
								<MDBRow className='gameContentBody'>
									<MDBCol>
										<h3 style={{ paddingTop: "15px" }}>Описание</h3>
										<div dangerouslySetInnerHTML={{ __html: game.rawg.description }} />
									</MDBCol>
								</MDBRow>
								<MDBRow>
									<MDBCol size='6' style={{ paddingLeft: "20px" }} hidden={!loggedIn}>
										<h3 style={{ paddingTop: "10px" }}>Отзывы</h3>
										<LoadingOverlay active={gameUserInfoIsLoading} spinner text='Загрузка...'>
											<MDBInput type='textarea' id='reviewInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
											<MDBInput type='number' id='spentTimeInput' label='Время прохождения (часы)' value={spentTime} onChange={(event) => setSpentTime(event.target.value)} />
											<button
												className={"savePreviewButton"}
												disabled={!loggedIn | (userStatus === "Не играл")}
												onClick={() => {
													if (!loggedIn) {
														openLoginForm();
													} else {
														setGameStatus({ review: document.getElementById("reviewInput").value, spent_time: document.getElementById("spentTimeInput").value });
													}
												}}>
												Сохранить
											</button>
										</LoadingOverlay>
									</MDBCol>
								</MDBRow>
							</MDBContainer>
							<div className='gameFriendsBlock' hidden={!loggedIn | (gameUserInfo?.friends_info?.length < 1)}>
								<h4>Отзывы друзей</h4>
								<FriendsActivity info={gameUserInfo?.friends_info} />
							</div>
						</MDBCol>
						<MDBCol md='0.5'></MDBCol>
					</MDBRow>
				</MDBContainer>
			</LoadingOverlay>
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	requestError: selectors.getGameRequestError(state),
	game: selectors.getContentGame(state),
	gameIsLoading: selectors.getIsLoadingContentGame(state),
	gameUserInfo: selectors.getContentGameUserInfo(state),
	gameUserInfoIsLoading: selectors.getIsLoadingContentGameUserInfo(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		requestGame: (id) => {
			dispatch(actions.requestGame(id));
		},
		requestGameUserInfo: (slug) => {
			dispatch(actions.requestGameUserInfo(slug));
		},
		openLoginForm: () => {
			dispatch(actions.openLoginForm());
		},
		setGameStatus: (status) => {
			dispatch(actions.setGameStatus(status));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(GamePage);
