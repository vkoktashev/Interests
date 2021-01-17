import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MDBIcon, MDBInput } from "mdbreact";
import "./style.css";
import LoadingOverlay from "react-loading-overlay";

import Rating from "react-rating";
import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import TimeToBeat from "./TimeToBeat";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
function GamePage({ requestGame, openLoginForm, setGameStatus, requestGameUserInfo, loggedIn, game, gameIsLoading, gameUserInfo, gameUserInfoIsLoading }) {
	let { id } = useParams();
	const [genres, setGenres] = useState("");
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
			setClearUI();
			requestGame(id);
		},
		// eslint-disable-next-line
		[id, requestGame]
	);

	useEffect(
		() => {
			if (loggedIn) requestGameUserInfo(id);
			else {
				setClearUI();
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
				setClearUI();
			}
		},
		// eslint-disable-next-line
		[gameUserInfo]
	);

	function setClear() {
		setGenres("");
		setHtlbInfo({ gameplay_main_extra: -1, gameplay_main: -1, gameplay_completionist: -1 });
		setDevelopers("");
		setDate("");
	}

	function setClearUI() {
		setReview("");
		setSpentTime(0);
		setUserStatus("Не играл");
		setUserRate(0);
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${game.rawg.background_image_additional ? game.rawg.background_image_additional : game.rawg.background_image})` }} />
			<LoadingOverlay active={gameIsLoading} spinner text='Загрузка...'>
				<div className='gameContentPage'>
					<div className='gameContentHeader'>
						<div className='posterBlock'>
							<img src={game.rawg.background_image} className='img-fluid' alt='' />
						</div>
						<div className='gameInfoBlock'>
							<h1 className='header'>{game.rawg.name}</h1>
							<div className='mainInfo'>
								<p className='header'>Разработчики: {developers}</p>
								<p>Дата релиза: {date}</p>
								<p>Жанр: {genres}</p>
								<TimeToBeat hltbInfo={hltbInfo} />
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
							<ScoreBlock score={game?.rawg?.metacritic} text='Metascore' className='scoreBlock' />
						</div>
					</div>
					<div className='gameContentBody'>
						<div>
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: game.rawg.description }} />
						</div>
						<div className='gameReviewBody' hidden={!loggedIn}>
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
						</div>
						<div className='gameFriendsBlock' hidden={!loggedIn | (gameUserInfo?.friends_info?.length < 1)}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={gameUserInfo?.friends_info} />
						</div>
					</div>
				</div>
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
