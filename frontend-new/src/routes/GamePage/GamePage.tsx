import React, {useEffect, useMemo, useState} from 'react';
import { useParams } from "react-router-dom";
import LoadingOverlay from "react-loading-overlay";
import _uniq from 'lodash/uniq';

import StatusButtonGroup from '../../shared/StatusButtonGroup';
import FriendsActivity from '../../shared/FriendsActivity';
import TimeToBeat from './views/TimeToBeat';
import ScoreBlock from '../../shared/ScoreBlock';
import Rating from '../../shared/Rating';
import InputNumber from '../../shared/InputNumber';

import "./game-page.scss";
import GameStores from "../../shared/GameStores";
import {useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParam} from '@steroidsjs/core/reducers/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import LoginForm from '../../modals/LoginForm';
import {Loader} from '@steroidsjs/core/ui/layout';

export function GamePage(props) {
	const user = useSelector(getUser);
	const dispatch = useDispatch();
	const gameId = useSelector(state => getRouteParam(state, 'gameId'));

	let { id } = useParams();
	const [review, setReview] = useState("");
	const [spentTime, setSpentTime] = useState("");
	const [userStatus, setUserStatus] = useState("Не играл");
	const [userRate, setUserRate] = useState(0);

	const gameFetchConfig = useMemo(() => gameId && ({
		url: `/api/games/game/${gameId}/`,
		method: 'get',
	}), [gameId]);
	const {data: game, isLoading} = useFetch(gameFetchConfig);

	const userInfoFetchConfig = useMemo(() => gameId && user && ({
		url: `/api/games/game/${gameId}/user_info/`,
		method: 'get',
	}), [gameId]);
	const {data: userInfoResponse, isLoading: userInfoIsLoading} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);

	useEffect(
		() => {
			setClearUI();
		},
		// eslint-disable-next-line
		[id]
	);

	useEffect(() => {
		document.title = game?.name || 'Interests';
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
		[userInfo]
	);

	function setClearUI() {
		setReview("");
		setSpentTime("");
		setUserStatus("Не играл");
		setUserRate(0);
	}

	function strToFloat(text) {
		if (typeof text === 'number') {
			return text.toFixed(1);
		}
		let cleanStr = text;
		if (cleanStr && cleanStr !== -1) {
			if (cleanStr.indexOf("½") + 1) {
				return parseFloat(cleanStr) + 0.5
			} else {
				return parseFloat(cleanStr).toFixed(1);
			}
		}
	}

	function hltbToDatalist(hltbInfo) {
		let newData = [];
		if (!(!hltbInfo || hltbInfo === "0 часов" || hltbInfo?.gameplay_main === -1)) {
			if (typeof hltbInfo === 'string') {
				newData.push(strToFloat(hltbInfo));
			} else {
				newData.push(strToFloat(hltbInfo?.gameplay_main));
			}
		}
		if (hltbInfo?.gameplay_main_extra !== -1) {
			newData.push(strToFloat(hltbInfo?.gameplay_main_extra));
		}
		if (hltbInfo?.gameplay_completionist !== -1) {
			newData.push(strToFloat(hltbInfo?.gameplay_completionist));
		}
		return _uniq(newData);
	}

	if (!game) {
		return <Loader />;
	}

	return (
		<div className='game-page'>
			<div style={{ backgroundImage: `url(${game?.background})` }} className='game-page__background' />
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
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
								<GameStores stores={game.stores} />
							</div>
							<LoadingOverlay
								active={userInfoIsLoading && !isLoading}
								spinner
								text='Загрузка...'
							>
								<Rating
									initialRating={userRate}
									readonly={!user || (userStatus === "Не играл")}
									onChange={(score) => {
										setUserRate(score);
										// TODO
										// setGameStatus({ score: score });
									}}
									className='game-page__rating'
								/>
								<StatusButtonGroup
									statuses={["Не играл", "Буду играть", "Играю", "Дропнул", "Прошел"]}
									className='game-page__info-statuses'
									userStatus={userStatus}
									onChangeStatus={(status) => {
										if (!user) {
											dispatch(openModal(LoginForm));
										} else {
											setUserStatus(status);
											// TODO
											// setGameStatus({ status: status });
											if (status === "Не играл") {
												setReview("");
												setUserRate(0);
											}
										}
									}}
								/>
							</LoadingOverlay>
							<ScoreBlock
								score={game.metacritic}
								text='Metascore'
								className='game-page__info-score'
							/>
						</div>
					</div>
					<div className='game-page__overview'>
						<div>
							{/* <video width='800' height='450' controls='controls' poster={game.rawg?.clip?.preview} src={game.rawg?.clip?.clip} type='video' /> */}
							<h3 className='game-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: game.overview }} />
						</div>
						<h3 className='game-page__review-header'>Отзыв</h3>
						<LoadingOverlay
							active={userInfoIsLoading && !isLoading}
							spinner
							text='Загрузка...'
						>
							<div className='game-page__review-body' hidden={!user}>
								<div className='game-page__review'>
									Ваш отзыв
									<textarea
										className='game-page__review-input'
										value={review}
										onChange={(event) => setReview(event.target.value)}
									/>
								</div>

								<div className='game-page__review-time'>
									Время прохождения (часы)
									<InputNumber
										className='game-page__time-input'
										value={spentTime}
										min={0}
										max={100000}
										onChange={(value) => setSpentTime(value)}
										dataList={hltbToDatalist(game.hltb)}
									/>
								</div>
								<button
									className='game-page__review-save-button'
									disabled={!user || (userStatus === "Не играл")}
									onClick={() => {
										if (!user) {
											dispatch(openModal(LoginForm))
										} else {
											// TODO
											// setGameReview({ review: review, spent_time: spentTime });
										}
									}}>
									Сохранить
								</button>
							</div>
						</LoadingOverlay>
						<div className='game-page__friends' hidden={!user || (friendsInfo?.length < 1)}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}
