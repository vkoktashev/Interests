import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import "./game-page.sass";
import GameStore from "store/GameStore";
import AuthStore from "store/AuthStore";
import PagesStore from "store/PagesStore";

import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";

import StatusButtonGroup from "components/Common/StatusButtonGroup/StatusButtonGroup";
import FriendsActivity from "components/Common/FriendsActivity/FriendsActivity";
import TimeToBeat from "../TimeToBeat/TimeToBeat";
import ScoreBlock from "components/Common/ScoreBlock/ScoreBlock";
import Rating from "components/Common/Rating/Rating";
import InputNumber from "components/Common/InputNumber/InputNumber";

/**
 * Основная страница приложения
 */
const GamePage = observer((props) => {
	const { game, gameState, requestGame, setGameStatus, setGameReview, userInfo, friendsInfo, userInfoState, requestUserInfo, anyError } = GameStore;
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

	function setClearUI() {
		setReview("");
		setSpentTime("");
		setUserStatus("Не играл");
		setUserRate(0);
	}

	function strToFloat(text) {
		let cleanStr = text;
		if (cleanStr && cleanStr !== -1)
			if (cleanStr.indexOf("½") + 1) return parseFloat(cleanStr) + 0.5;
			else return parseFloat(cleanStr);
	}

	function hltbToDatalist(hltbInfo) {
		let newData = [];
		if (!(!hltbInfo || hltbInfo === "0 часов" || hltbInfo?.gameplay_main === -1)) newData.push(strToFloat(hltbInfo?.gameplay_main ? hltbInfo?.gameplay_main : hltbInfo));
		if (hltbInfo?.gameplay_main_extra !== -1) newData.push(strToFloat(hltbInfo?.gameplay_main_extra));
		if (hltbInfo?.gameplay_completionist !== -1) newData.push(strToFloat(hltbInfo?.gameplay_completionist));

		return newData;
	}

	return (
		<div className='game-page'>
			<div style={{ backgroundImage: `url(${game.background})` }} className='game-page__background' />
			<LoadingOverlay active={gameState === "pending"} spinner text='Загрузка...'>
				<div className='game-page__body'>
					<div className='game-page__header'>
						<div className='game-page__poster'>
							<img src={game.poster} className='img-fluid' alt='' />
						</div>
						<div className='game-page__info'>
							<h1 className='game-page__info-header'>{game.name}</h1>
							<div className='game-page__info-body'>
								<p>Разработчики: {game.developers}</p>
								<p>Дата релиза: {game.release_date}</p>
								<p>Жанр: {game.genres}</p>
								<p>Платформы: {game.platforms}</p>
								<TimeToBeat hltbInfo={game.hltb || game.playtime} />
							</div>
							<LoadingOverlay active={userInfoState === "pending" && gameState !== "pending"} spinner text='Загрузка...'>
								<Rating
									initialRating={userRate}
									readonly={!loggedIn | (userStatus === "Не играл")}
									onChange={(score) => {
										setUserRate(score);
										setGameStatus({ score: score });
									}}
									className='game-page__rating'
								/>
								<StatusButtonGroup
									statuses={["Не играл", "Буду играть", "Играю", "Дропнул", "Прошел"]}
									className='game-page__info-statuses'
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
							<ScoreBlock score={game.metacritic} text='Metascore' className='game-page__info-score' />
						</div>
					</div>
					<div className='game-page__overview'>
						<div>
							{/* <video width='800' height='450' controls='controls' poster={game.rawg?.clip?.preview} src={game.rawg?.clip?.clip} type='video' /> */}
							<h3 className='game-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: game.overview }} />
						</div>
						<h3 className='game-page__review-header'>Отзыв</h3>
						<LoadingOverlay active={userInfoState === "pending" && gameState !== "pending"} spinner text='Загрузка...'>
							<div className='game-page__review-body' hidden={!loggedIn}>
								<div className='game-page__review'>
									Ваш отзыв
									<textarea type='textarea' className='game-page__review-input' value={review} onChange={(event) => setReview(event.target.value)} />
								</div>

								<div className='game-page__review-time'>
									Время прохождения (часы)
									<InputNumber className='game-page__time-input' value={spentTime} min={0} max={100000} onChange={(value) => setSpentTime(value)} dataList={hltbToDatalist(game.hltb)} />
								</div>
								<button
									className='game-page__review-save-button'
									disabled={!loggedIn | (userStatus === "Не играл")}
									onClick={() => {
										if (!loggedIn) {
											openLoginForm();
										} else {
											setGameReview({ review: review, spent_time: spentTime });
										}
									}}>
									Сохранить
								</button>
							</div>
						</LoadingOverlay>
						<div className='game-page__friends' hidden={!loggedIn | (friendsInfo?.length < 1)}>
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
