import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParam} from '@steroidsjs/core/reducers/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import _uniq from 'lodash/uniq';
import {Loader} from '@steroidsjs/core/ui/layout'
import StatusButtonGroup from '../../shared/StatusButtonGroup';
import FriendsActivity from '../../shared/FriendsActivity';
import TimeToBeat from './views/TimeToBeat';
import ScoreBlock from '../../shared/ScoreBlock';
import Rating from '../../shared/Rating';
import InputNumber from '../../shared/InputNumber';
import GameStores from "../../shared/GameStores";
import LoginForm from '../../modals/LoginForm';
import "./game-page.scss";
import {Button, TextField} from '@steroidsjs/core/ui/form';

export function GamePage() {
	const bem = useBem('game-page');
	const user = useSelector(getUser);
	const dispatch = useDispatch();
	const {http} = useComponents();
	const gameId = useSelector(state => getRouteParam(state, 'gameId'));

	const [review, setReview] = useState("");
	const [spentTime, setSpentTime] = useState("");
	const [userStatus, setUserStatus] = useState("Не играл");
	const [userRate, setUserRate] = useState(0);

	const gameFetchConfig = useMemo(() => gameId && ({
		url: `/games/game/${gameId}/`,
		method: 'get',
	}), [gameId]);
	const {data: game, isLoading} = useFetch(gameFetchConfig);

	const gameTimeFetchConfig = useMemo(() => gameId && ({
		url: `/games/game/${gameId}/hltb/`,
		method: 'get',
	}), [gameId]);
	const {data: gameTime, isLoading: isTimeLoading} = useFetch(gameTimeFetchConfig);

	const userInfoFetchConfig = useMemo(() => gameId && user && ({
		url: `/games/game/${gameId}/user_info/`,
		method: 'get',
	}), [gameId]);
	const {data: userInfoResponse, isLoading: userInfoIsLoading, fetch: fetchUserInfo} = useFetch(userInfoFetchConfig);

	const userInfo = useMemo(() => userInfoResponse?.user_info, [userInfoResponse]);
	const friendsInfo = useMemo(() => userInfoResponse?.friends_info, [userInfoResponse]);

	const setGameStatus = useCallback(async (payload) => {
		http.send('PUT', `/games/game/${gameId}/`, payload).catch(e => {
			fetchUserInfo();
		});
	}, [gameId]);

	useEffect(
		() => {
			setClearUI();
		},
		// eslint-disable-next-line
		[gameId]
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
		return _uniq(newData).filter(Boolean);
	}

	if (!game) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div style={{ backgroundImage: `url(${game?.background})` }} className='game-page__background' />
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
				<div className={bem.element('body')}>
					<div className={bem.element('header')}>
						<div className={bem.element('poster')}>
							<img src={game.poster} className={bem.element('poster-image')} alt='' />
						</div>
						<div className={bem.element('info')}>
							<h1 className={bem.element('info-header')}>
								{game.name}
							</h1>
							<div className={bem.element('info-body')}>
								<p>Разработчики: {game.developers}</p>
								<p>Дата релиза: {game.release_date}</p>
								<p>Жанр: {game.genres}</p>
								<p>Платформы: {game.platforms}</p>
								<TimeToBeat hltbInfo={gameTime} rawgPlayTime={game.playtime} />
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
										setGameStatus({ score });
									}}
									className='game-page__rating'
								/>
								<StatusButtonGroup
									statuses={["Не играл", "Буду играть", "Играю", "Дропнул", "Прошел"]}
									className={bem.element('info-statuses')}
									userStatus={userStatus}
									onChangeStatus={(status) => {
										if (!user) {
											dispatch(openModal(LoginForm));
										} else {
											setUserStatus(status);
											setGameStatus({ status });
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
								className={bem.element('info-score')}
							/>
						</div>
					</div>
					<div className={bem.element('overview')}>
						<div>
							{/* <video width='800' height='450' controls='controls' poster={game.rawg?.clip?.preview} src={game.rawg?.clip?.clip} type='video' /> */}
							<h3 className='game-page__overview-header'>Описание</h3>
							<div dangerouslySetInnerHTML={{ __html: game.overview }} />
						</div>
						<h3 className={bem.element('review-header')}>
							Отзыв
						</h3>
						<LoadingOverlay
							active={userInfoIsLoading && !isLoading}
							spinner
							text='Загрузка...'
						>
							<div className={bem.element('review-body')} hidden={!user}>
								<TextField
									label={__('Ваш отзыв')}
									value={review}
									onChange={(value) => setReview(value)}
								/>

								<div className={bem.element('review-time')}>
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
								<Button
									className={bem.element('button')}
									label={__('Сохранить')}
									disabled={!user || (userStatus === "Не играл")}
									onClick={() => {
										if (!user) {
											dispatch(openModal(LoginForm));
										} else {
											setGameStatus({
												review: review,
												spent_time: spentTime,
											}).then(() => {
												dispatch(showNotification('Отзыв сохранен!', 'success', {
													position: 'top-right',
													timeOut: 1000,
												}));
											});
										}
									}} />
							</div>
						</LoadingOverlay>
						<div className={bem.element('friends')} hidden={!user || (friendsInfo?.length < 1)}>
							<h4>Отзывы друзей</h4>
							<FriendsActivity info={friendsInfo} />
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}
