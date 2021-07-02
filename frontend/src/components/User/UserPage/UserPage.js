import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../../store/AuthStore";
import UserStore from "../../../store/UserStore";
import { MDBIcon } from "mdbreact";

import LoadingOverlay from "react-loading-overlay";
import GameBlock from "../ItemsBlock/GameBlock";
import FriendBlock from "../../Common/FriendBlock/FriendBlock";
import MovieBlock from "../ItemsBlock/MovieBlock";
import UserLogs from "../Logs/UserLogs/UserLogs";
import CategoriesTab from "../../Common/CategoriesTab/CategoriesTab";
import ShowBlock from "../ItemsBlock/ShowBlock";
import StatisticsBlock from "../Statistics/StatisticsBlock/StatisticsBlock";

import "./user-page.sass";

/**
 * Основная страница приложения
 */
const UserPage = observer((props) => {
	const { currentUser } = AuthStore;
	const { user, userState, requestUser, setUserStatus, requestUserLogs, userLogs, userLogsState, requestUserFriendsLogs, userFriendsLogs, userFriendsLogsState, deleteUserLog, isCurrentUser } =
		UserStore;

	let { userID, category } = useParams();
	const [activeCategory, setActiveCategory] = useState("Лента");
	const [lastActivity, setLastActivity] = useState("");

	useEffect(
		() => {
			requestUser(userID);
			setActiveCategory("Лента");
		},
		// eslint-disable-next-line
		[userID, requestUser]
	);

	useEffect(
		() => {
			if (category) setActiveCategory(category);
			else setActiveCategory("Лента");
		},
		// eslint-disable-next-line
		[category]
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
		<div className='user-page'>
			<LoadingOverlay active={userState === "pending"} spinner text='Загрузка...'>
				<div className='user-page__body'>
					<div className='user-page__header'>
						<div className='user-page__user-card'>
							<div className='user-page__user-avatar' style={{ backgroundImage: `url(${"https://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }} />
							<div>
								<h2 className='user-page__username'>{user.username}</h2>
								<div hidden={!user.is_available} className='user-page__last-activity'>
									Последняя активность {lastActivity}
								</div>
							</div>
						</div>

						<button
							hidden={isCurrentUser || !user.is_available}
							className='user-page__subscribe-button'
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
									<UserLogs userID={userID} logs={userLogs} requestUserLogs={requestUserLogs} currentUser={isCurrentUser} onDeleteLog={deleteUserLog} logsType={"user"} />
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
								<LoadingOverlay active={userFriendsLogsState === "pending" && userState !== "pending"} spinner text='Загрузка активности...'>
									<UserLogs userID={userID} logs={userFriendsLogs} requestUserLogs={requestUserFriendsLogs} currentUser={isCurrentUser} showUsername={true} logsType={"userFriends"} />
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
