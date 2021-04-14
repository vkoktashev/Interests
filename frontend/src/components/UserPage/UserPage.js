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
import UserLogBlock from "./UserLogBlock";
import CategoriesTab from "../Common/CategoriesTab";
import ShowBlock from "./ShowBlock";
import ChartBlock from "./ChartBlock";

const LOG_ROWS_COUNT = 20;

/**
 * Основная страница приложения
 */
const UserPage = observer((props) => {
	const { loggedIn, currentUser } = AuthStore;
	const { user, userState, requestUser, setUserStatus, requestUserLogs, userLogs, userLogsState, requestUserFriendsLogs, userFriendsLogs, userFriendsLogsState } = UserStore;

	let { userID, category } = useParams();
	const [activeCategory, setActiveCategory] = useState("Профиль");
	const [lastActivity, setLastActivity] = useState("");

	useEffect(
		() => {
			requestUser(userID);
			requestUserLogs(userID, 1, LOG_ROWS_COUNT);
			setActiveCategory("Профиль");
		},
		// eslint-disable-next-line
		[userID, requestUser, requestUserLogs]
	);

	useEffect(
		() => {
			if (category) setActiveCategory(category);
			else setActiveCategory("Профиль");
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
		[loggedIn, userID]
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
			<div className={"bg " + (!user.backdrop_path ? " textureBG" : "")} style={{ backgroundImage: user.backdrop_path ? `url(${user.backdrop_path})` : "" }} />
			<LoadingOverlay active={userState === "pending"} spinner text='Загрузка...'>
				<div className='contentBody header'>
					<div className='userHeader'>
						<div className='userCard'>
							<div className='userAvatar' style={{ backgroundImage: `url(${"http://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }} />
							<div>
								<h2>{user.username}</h2>
								<p hidden={!user.is_available}>Последняя активность {lastActivity}</p>
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
						categories={["Профиль", "Игры", "Фильмы", "Сериалы", "Друзья"]}
						activeCategory={activeCategory}
						onChangeCategory={(category) => {
							setActiveCategory(category);
						}}>
						<div hidden={activeCategory !== "Профиль"}>
							<div hidden={!user.is_available}>
								<h4>Моя активность: </h4>
								<LoadingOverlay active={userLogsState === "pending" && userState !== "pending"} spinner text='Загрузка активности...'>
									<ChartBlock stats={user.stats} />
									<UserLogBlock logs={userLogs} onChangePage={(pageNumber) => requestUserLogs(userID, pageNumber, LOG_ROWS_COUNT)} />
								</LoadingOverlay>
							</div>
							<h4 hidden={user.is_available}>
								<MDBIcon icon='lock' style={{ marginRight: "1rem" }} />
								Профиль скрыт настройками приватности
							</h4>
						</div>
						<div hidden={activeCategory !== "Игры"}>
							<GameBlock games={user.games} stats={user?.stats?.games} />
						</div>
						<div hidden={activeCategory !== "Фильмы"}>
							<MovieBlock movies={user.movies} stats={user?.stats?.movies} />
						</div>
						<div hidden={activeCategory !== "Сериалы"}>
							<ShowBlock shows={user.shows} stats={user?.stats?.episodes} />
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
