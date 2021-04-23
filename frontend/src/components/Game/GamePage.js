import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import GameStore from "../../store/GameStore";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";
import CurrentUserStore from "../../store/CurrentUserStore";

import { MDBInput } from "mdbreact";
import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";

import StatusButtonGroup from "../Common/StatusButtonGroup";
import FriendsActivity from "../Common/FriendsActivity";
import TimeToBeat from "./TimeToBeat";
import ScoreBlock from "../Common/ScoreBlock";
import Rating from "../Common/Rating";

/**
 * Основная страница приложения
 */
const GamePage = observer((props) => {
	const { game, gameState, requestGame, setGameStatus, userInfo, friendsInfo, userInfoState, requestUserInfo, anyError } = GameStore;
	const { saveSettingsState } = CurrentUserStore;
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

	useEffect(() => {
		if (anyError) toast.error(anyError);
	}, [anyError]);
	useEffect(() => {
		if (saveSettingsState.startsWith("error:")) toast.error(`Ошибка фона! ${saveSettingsState}`);
		else if (saveSettingsState === "saved") toast.success(`Фон установлен!`);
	}, [saveSettingsState]);

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
			<LoadingOverlay active={gameState === "pending"} spinner text='Загрузка...'>
				<div className='contentPage'>
					<div className='contentHeader'>
						<div className='posterBlock widePoster'>
							<img src={game.poster} className='img-fluid' alt='' />
						</div>
						<div className='infoBlock tightInfo'>
							<h1 className='header'>{game.name}</h1>
							<div className='mainInfo'>
								<p>Разработчики: {game.developers}</p>
								<p>Дата релиза: {game.release_date}</p>
								<p>Жанр: {game.genres}</p>
								<p>Платформы: {game.platforms}</p>
								<TimeToBeat hltbInfo={game.hltb} />
							</div>
							<LoadingOverlay active={userInfoState === "pending" && gameState !== "pending"} spinner text='Загрузка...'>
								<Rating
									initialRating={userRate}
									readonly={!loggedIn | (userStatus === "Не играл")}
									onChange={(score) => {
										setUserRate(score);
										setGameStatus({ score: score });
									}}
									size='1.5rem'
								/>
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
					<div className='contentBody'>
						<div>
							{/* <video width='800' height='450' controls='controls' poster={game.rawg?.clip?.preview} src={game.rawg?.clip?.clip} type='video' /> */}
							<h3>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: game.overview }} />
						</div>
						<h3 style={{ paddingTop: "10px" }}>Отзывы</h3>
						<div className='reviewBody' hidden={!loggedIn}>
							<LoadingOverlay active={userInfoState === "pending" && gameState !== "pending"} spinner text='Загрузка...'>
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
									className={"saveReviewButton"}
									disabled={!loggedIn | (userStatus === "Не играл")}
									onClick={() => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setGameStatus({ review: review, spent_time: spentTime });
										}
									}}>
									Сохранить
								</button>
							</LoadingOverlay>
						</div>
						<div className='additionalBody'></div>
						<div className='friendsBlock' hidden={!loggedIn | (friendsInfo?.length < 1)}>
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
