import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import UserStore from "../../store/UserStore";
import { MDBIcon } from "mdbreact";

import LoadingOverlay from "react-loading-overlay";
import GameBlock from "./GameBlock";
import FriendBlock from "../Common/FriendBlock";
import MovieBlock from "./MovieBlock";
import UserLogBlock from "./Logs/UserLogBlock";
import CategoriesTab from "../Common/CategoriesTab";
import ShowBlock from "./ShowBlock";
import StatisticsBlock from "./Statistics/StatisticsBlock";

const LOG_ROWS_COUNT = 20;

/**
 * Основная страница приложения
 */
const UserPage = observer((props) => {
	const { loggedIn, currentUser } = AuthStore;
	const { user, userState, requestUser, setUserStatus, requestUserLogs, userLogs, userLogsState, requestUserFriendsLogs, userFriendsLogs, userFriendsLogsState } = UserStore;

	let { userID, category } = useParams();
	const [activeCategory, setActiveCategory] = useState("Лента");
	const [lastActivity, setLastActivity] = useState("");

	useEffect(
		() => {
			requestUser(userID);
			requestUserLogs(userID, 1, LOG_ROWS_COUNT);
			setActiveCategory("Лента");
		},
		// eslint-disable-next-line
		[userID, requestUser, requestUserLogs]
	);

	useEffect(
		() => {
			if (category) setActiveCategory(category);
			else setActiveCategory("Лента");
		},
		// eslint-disable-next-line
		[category]
	);

	useEffect(
		() => {
			if (loggedIn && currentUser.username === user.username) {
				requestUserFriendsLogs(userID, 1, LOG_ROWS_COUNT);
			}
		},
		// eslint-disable-next-line
		[loggedIn, currentUser.username, user.username]
	);

	useEffect(() => {
		document.title = "Профиль " + user.username;
		if (user.last_activity) {
			let date = new Date(user.last_activity);
			let options = { year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" };
			setLastActivity(date.toLocaleString("ru-RU", options));
		} else setLastActivity("");
	}, [user]);

	return (
		<div className='contentPage'>
			<div className='bg' />
			<LoadingOverlay active={userState === "pending"} spinner text='Загрузка...'>
				<div className='contentBody header dark'>
					<div className='userHeader'>
						<div className='userCard'>
							<div className='userAvatar' style={{ backgroundImage: `url(${"http://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }} />
							<div>
								<h2>{user.username}</h2>
								<div hidden={!user.is_available} className='subtitle'>
									Последняя активность {lastActivity}
								</div>
							</div>
						</div>

						<button
							hidden={currentUser.username === user.username || !user.is_available}
							className='addFriendButton'
							onClick={() => {
								setUserStatus({ is_following: user.is_followed ? false : true }, user.id);
							}}>
							{user.is_followed ? "Отписаться" : "Подписаться"}
						</button>
					</div>

					<CategoriesTab
						categories={["Лента", "Игры", "Фильмы", "Сериалы", "Статистика", "Друзья"]}
						activeCategory={activeCategory}
						onChangeCategory={(category) => {
							setActiveCategory(category);
						}}>
						<div hidden={activeCategory !== "Лента"}>
							<div hidden={!user.is_available}>
								<LoadingOverlay active={userLogsState === "pending" && userState !== "pending"} spinner text='Загрузка активности...'>
									<UserLogBlock logs={userLogs} onChangePage={(pageNumber) => requestUserLogs(userID, pageNumber, LOG_ROWS_COUNT)} />
								</LoadingOverlay>
							</div>
							<h4 hidden={user.is_available || userState === "pending"}>
								<MDBIcon icon='lock' style={{ marginRight: "1rem" }} />
								Профиль скрыт настройками приватности
							</h4>
						</div>
						<div hidden={activeCategory !== "Игры"}>
							<GameBlock games={user.games} />
						</div>
						<div hidden={activeCategory !== "Фильмы"}>
							<MovieBlock movies={user.movies} />
						</div>
						<div hidden={activeCategory !== "Сериалы"}>
							<ShowBlock shows={user.shows} />
						</div>
						<div hidden={activeCategory !== "Статистика"}>
							<StatisticsBlock stats={user.stats} />
						</div>
						<div hidden={activeCategory !== "Друзья"}>
							<FriendBlock users={user.followed_users ? user.followed_users : []} />
							<div hidden={currentUser.username !== user.username}>
								<h4>Активность друзей: </h4>
								<LoadingOverlay active={userFriendsLogsState === "pending" && !userState === "pending"} spinner text='Загрузка активности...'>
									<UserLogBlock logs={userFriendsLogs} onChangePage={(pageNumber) => requestUserFriendsLogs(userID, pageNumber, LOG_ROWS_COUNT)} showUsername={true} />
								</LoadingOverlay>
							</div>
						</div>
					</CategoriesTab>
				</div>
			</LoadingOverlay>
		</div>
	);
});

export default UserPage;
