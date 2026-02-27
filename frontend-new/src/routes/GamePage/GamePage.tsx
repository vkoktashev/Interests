import React, {useCallback, useEffect, useMemo, useState} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getRouteParam} from '@steroidsjs/core/reducers/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import _uniq from 'lodash/uniq';
import {FaTwitch, FaYoutube, FaPencilAlt} from 'react-icons/fa';
import {GiTigerHead} from 'react-icons/gi';
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
	const [isOverviewExpanded, setOverviewExpanded] = useState(false);
	const [shouldLoadHltb, setShouldLoadHltb] = useState(false);

	const gameFetchConfig = useMemo(() => gameId && ({
		url: `/games/game/${gameId}/`,
		method: 'get',
	}), [gameId]);
	const {data: game, isLoading} = useFetch(gameFetchConfig);

	const gameTimeFetchConfig = useMemo(() => gameId && shouldLoadHltb && ({
		url: `/games/game/${gameId}/hltb/`,
		method: 'get',
	}), [gameId, shouldLoadHltb]);
	const {data: gameTime} = useFetch(gameTimeFetchConfig);

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
	}, [fetchUserInfo, gameId, http]);

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

	useEffect(() => {
		setOverviewExpanded(false);
	}, [gameId]);

	useEffect(() => {
		setShouldLoadHltb(false);
	}, [gameId]);

	useEffect(() => {
		if (!gameId || !game) {
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setShouldLoadHltb(true);
		}, 400);

		return () => window.clearTimeout(timeoutId);
	}, [gameId, game]);

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

	const mediaLinks = useMemo(() => {
		const gameName = (game?.name || '').trim();
		if (!gameName) {
			return [];
		}

		const links = [
			{
				id: 'twitch',
				title: 'Twitch',
				href: `https://www.twitch.tv/search?term=${encodeURIComponent(gameName)}`,
				Icon: FaTwitch,
			},
			{
				id: 'youtube',
				title: 'YouTube',
				href: `https://www.youtube.com/results?search_query=${encodeURIComponent(gameName)}`,
				Icon: FaYoutube,
			},
		];

		if (game?.red_tigerino_playlist_url) {
			links.push({
				id: 'redTigerino',
				title: 'Прохождение ReD_TiGeRiNo',
				href: game.red_tigerino_playlist_url,
				Icon: GiTigerHead,
			});
		}

		return links;
	}, [game?.name, game?.red_tigerino_playlist_url]);

	const canEditRedTigerinoPlaylist = useMemo(
		() => Boolean(user?.permissions?.includes('games.change_game')),
		[user?.permissions],
	);
	const adminEditUrl = useMemo(() => {
		if (!game?.id) {
			return '';
		}
		const backendUrl = (process.env.APP_BACKEND_URL || '').replace(/\/+$/, '');
		return `${backendUrl}/admin/games/game/${game.id}/change/`;
	}, [game?.id]);

	const infoRows = useMemo(() => ([
		{label: 'Разработчики', value: game?.developers},
		{label: 'Дата релиза', value: game?.release_date},
		{label: 'Жанр', value: game?.genres},
		{label: 'Платформы', value: game?.platforms},
	]).filter(item => Boolean(item.value)), [game?.developers, game?.release_date, game?.genres, game?.platforms]);

	const overviewPlainText = useMemo(
		() => String(game?.overview || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
		[game?.overview]
	);
	const canCollapseOverview = overviewPlainText.length > 420;

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
							<div className={bem.element('title-row')}>
								<h1 className={bem.element('info-header')}>
									{game.name}
								</h1>
								<div className={bem.element('title-actions')}>
									<a
										hidden={!canEditRedTigerinoPlaylist}
										className={bem.element('edit-button')}
										href={adminEditUrl}
										target='_blank'
										rel='noreferrer'
										aria-label='Редактировать игру'
										title='Редактировать игру'
									>
										<FaPencilAlt />
									</a>
									<ScoreBlock
										score={game.metacritic}
										text='Metascore'
										className={bem.element('info-score')}
									/>
								</div>
							</div>

							<div className={bem.element('info-panel')}>
								<div className={bem.element('info-list')}>
									{infoRows.map(item => (
										<div key={item.label} className={bem.element('info-row')}>
											<span className={bem.element('info-row-label')}>{item.label}</span>
											<span className={bem.element('info-row-value')}>{item.value}</span>
										</div>
									))}
								</div>

								<TimeToBeat hltbInfo={gameTime} rawgPlayTime={game.playtime} className={bem.element('time-to-beat')} />

								<div className={bem.element('resources')}>
									<div className={bem.element('resources-grid')}>
										<div className={bem.element('resource-group')}>
											<div className={bem.element('resource-group-label')}>Магазины</div>
											<GameStores stores={game.stores} showLabel={false} className={bem.element('stores')} />
										</div>

										<div className={bem.element('resource-group')} hidden={!mediaLinks.length}>
											<div className={bem.element('resource-group-label')}>Контент</div>
											<div className={bem.element('media-links')}>
												{mediaLinks.map(({id, title, href, Icon}) => (
													<a
														key={id}
														href={href}
														target='_blank'
														rel='noreferrer'
														title={title}
														aria-label={title}
														className={bem.element('media-link', {[id]: true})}
													>
														<Icon className={bem.element('media-link-icon')} />
													</a>
												))}
											</div>
										</div>
									</div>
								</div>
							</div>

							<LoadingOverlay
								active={userInfoIsLoading && !isLoading}
								spinner
								text='Загрузка...'
							>
								<div className={bem.element('actions-panel')}>
									<div className={bem.element('actions-rating')}>
										<Rating
											initialRating={userRate}
											readonly={!user || (userStatus === "Не играл")}
											onChange={(score) => {
												setUserRate(score);
												setGameStatus({ score });
											}}
											className='game-page__rating'
										/>
									</div>
									<div className={bem.element('actions-statuses')}>
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
									</div>
								</div>
							</LoadingOverlay>
						</div>
					</div>
					<div className={bem.element('overview')}>
						<div className={bem.element('content-grid')}>
							<div className={bem.element('main-column')}>
								<section className={bem.element('content-card', {description: true})}>
								<h3 className={bem.element('overview-header')}>Описание</h3>
								<div
									className={bem.element('overview-content', {
										collapsed: canCollapseOverview && !isOverviewExpanded,
									})}
									dangerouslySetInnerHTML={{ __html: game.overview }}
								/>
								<div className={bem.element('overview-actions')} hidden={!canCollapseOverview}>
									<button
										type='button'
										className={bem.element('overview-toggle')}
										onClick={() => setOverviewExpanded(prev => !prev)}
									>
										{isOverviewExpanded ? 'Свернуть' : 'Показать полностью'}
									</button>
								</div>
								</section>

								<section className={bem.element('content-card', {review: true})} hidden={!user}>
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
												<span className={bem.element('review-time-label')}>Время прохождения (часы)</span>
												<InputNumber
													className='game-page__time-input'
													value={spentTime}
													min={0}
													max={100000}
													onChange={(value) => setSpentTime(value as any)}
													dataList={hltbToDatalist(gameTime || (game as any).hltb)}
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
								</section>
							</div>

							<div className={bem.element('side-column')}>
								<section className={bem.element('content-card', {friends: true})} hidden={!user}>
									<h4 className={bem.element('friends-header')}>Отзывы друзей</h4>
									{friendsInfo?.length > 0 ? (
										<FriendsActivity info={friendsInfo} />
									) : (
										<div className={bem.element('friends-empty')}>
											Никто из друзей ещё не играл в эту игру
										</div>
									)}
								</section>
							</div>
						</div>
					</div>
				</div>
			</LoadingOverlay>
		</div>
	);
}
