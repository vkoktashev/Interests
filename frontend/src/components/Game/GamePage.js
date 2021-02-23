import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import GameStore from "../../store/GameStore";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";

import { MDBIcon, MDBInput } from "mdbreact";
import "./style.css";
import LoadingOverlay from "react-loading-overlay";

import Rating from "react-rating";
import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import TimeToBeat from "./TimeToBeat";
import ScoreBlock from "../Common/ScoreBlock";

/**
 * Основная страница приложения
 */
const GamePage = observer((props) => {
	const { game, gameIsLoading, requestGame, setGameStatus, userInfo, friendsInfo, userInfoIsLoading, requestUserInfo } = GameStore;
	const { loggedIn } = AuthStore;
	const { openLoginForm } = PagesStore;

	let { id } = useParams();
	const [review, setReview] = useState("");
	const [spentTime, setSpentTime] = useState("");
	const [userStatus, setUserStatus] = useState("Не играл");
	const [userRate, setUserRate] = useState(0);

	useEffect(
		() => {
			setClearUI();
			requestGame(id);
		},
		// eslint-disable-next-line
		[id, requestGame]
	);

	useEffect(
		() => {
			if (loggedIn) requestUserInfo(id);
			else {
				setClearUI();
			}
		},
		// eslint-disable-next-line
		[id, loggedIn]
	);

	useEffect(() => {
		document.title = game.name;
	}, [game]);

	useEffect(
		() => {
			if (userInfo?.status) {
				setReview(userInfo.review);
				setSpentTime(userInfo.spent_time);
				setUserStatus(userInfo.status);
				setUserRate(userInfo.score);
			} else {
				setClearUI();
			}
		},
		// eslint-disable-next-line
		[userInfo]
	);

	function setClearUI() {
		setReview("");
		setSpentTime("");
		setUserStatus("Не играл");
		setUserRate(0);
	}

	function getTimeToBeatDatalist() {
		if (game.hltb) {
			return (
				<datalist id='timesList'>
					<option value={strToFloat(game.hltb?.gameplay_main_extra)} className='testil' />
					<option value={strToFloat(game.hltb?.gameplay_main)} />
					<option value={strToFloat(game.hltb?.gameplay_completionist)} />
				</datalist>
			);
		}
		return null;
	}

	function strToFloat(str) {
		if (str & (str !== -1))
			if (str.indexOf("½") + 1) return parseFloat(str) + 0.5;
			else return parseFloat(str);
	}

	return (
		<div>
			<div className='bg' style={{ backgroundImage: `url(${game.background})` }} />
			<LoadingOverlay active={gameIsLoading} spinner text='Загрузка...'>
				<div className='gameContentPage'>
					<div className='gameContentHeader'>
						<div className='posterBlock'>
							<img src={game.poster} className='img-fluid' alt='' />
						</div>
						<div className='gameInfoBlock'>
							<h1 className='header'>{game.name}</h1>
							<div className='mainInfo'>
								<p>Разработчики: {game.developers}</p>
								<p>Дата релиза: {game.date}</p>
								<p>Жанр: {game.genres}</p>
								<p>Платформы: {game.platforms}</p>
								<TimeToBeat hltbInfo={game.hltb} />
							</div>
							<LoadingOverlay active={userInfoIsLoading && !gameIsLoading} spinner text='Загрузка...'>
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
							<ScoreBlock score={game.metacritic} text='Metascore' className='scoreBlock' />
						</div>
					</div>
					<div className='gameContentBody'>
						<div>
							{/* <video width='800' height='450' controls='controls' poster={game.rawg?.clip?.preview} src={game.rawg?.clip?.clip} type='video' /> */}
							<h3 style={{ paddingTop: "15px" }}>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: game.overview }} />
						</div>
						<div className='gameReviewBody' hidden={!loggedIn}>
							<h3 style={{ paddingTop: "10px" }}>Отзывы</h3>
							<LoadingOverlay active={userInfoIsLoading && !gameIsLoading} spinner text='Загрузка...'>
								<MDBInput type='textarea' id='reviewInput' label='Ваш отзыв' value={review} onChange={(event) => setReview(event.target.value)} outline />
								<MDBInput
									type='number'
									id='spentTimeInput'
									label='Время прохождения (часы)'
									list='timesList'
									value={spentTime}
									onChange={(event) => setSpentTime(event.target.value)}
								/>
								{getTimeToBeatDatalist()}
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
						<div className='gameFriendsBlock' hidden={!loggedIn | (friendsInfo?.length < 1)}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default GamePage;
