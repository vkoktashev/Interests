import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import UserStore from "../../store/UserStore";

import { MDBRow, MDBCol, MDBContainer } from "mdbreact";

import LoadingOverlay from "react-loading-overlay";
import GameBlock from "./GameBlock";
import FriendBlock from "./FriendBlock";
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

	let { userID } = useParams();
	const [activeCategory, setActiveCategory] = useState("Профиль");
	const [lastActivity, setLastActivity] = useState("");

	useEffect(
		() => {
			requestUser(userID);
			requestUserLogs(userID, 1, LOG_ROWS_COUNT);
		},
		// eslint-disable-next-line
		[userID, requestUser, requestUserLogs]
	);

	useEffect(
		() => {
			if (loggedIn) {
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
			Date.now();
			setLastActivity(date.toLocaleString());
		} else setLastActivity("");
	}, [user]);

	return (
		<div>
			<div className='bg searchBG' />
			<LoadingOverlay active={userState === "pending"} spinner text='Загрузка...'>
				<MDBContainer>
					<MDBRow>
						<MDBCol md='0.5'></MDBCol>
						<MDBCol className='userPage'>
							<h1>Информация о пользователе {user.username}</h1>
							<p>Последняя активность {lastActivity}</p>
							<button
								hidden={currentUser.username === user.username}
								className='addFriendButton'
								onClick={() => {
									setUserStatus({ is_following: user.is_followed ? false : true }, user.id);
								}}>
								{user.is_followed ? "Отписаться" : "Подписаться"}
							</button>
							<CategoriesTab
								categories={["Профиль", "Игры", "Фильмы", "Сериалы", "Друзья"]}
								activeColor='#7654de'
								activeCategory={activeCategory}
								onChangeCategory={(category) => {
									setActiveCategory(category);
								}}
							/>

							<div hidden={activeCategory !== "Профиль"}>
								<h4>Моя активность: </h4>
								<LoadingOverlay active={userLogsState === "pending" && !userState === "pending"} spinner text='Загрузка активности...'>
									<ChartBlock stats={user.stats} />
									<UserLogBlock logs={userLogs} onChangePage={(pageNumber) => requestUserLogs(userID, pageNumber, LOG_ROWS_COUNT)} />
								</LoadingOverlay>
							</div>
							<div hidden={activeCategory !== "Игры"}>
								<GameBlock games={user.games} stats={user.stats.games} />
							</div>
							<div hidden={activeCategory !== "Фильмы"}>
								<MovieBlock movies={user.movies} stats={user.stats.movies} />
							</div>
							<div hidden={activeCategory !== "Сериалы"}>
								<ShowBlock shows={user.shows} stats={user.stats.episodes} />
							</div>
							<div hidden={activeCategory !== "Друзья"}>
								<FriendBlock users={user.followed_users ? user.followed_users : []} />
								<h4>Активность друзей: </h4>
								<LoadingOverlay active={userFriendsLogsState === "pending" && !userState === "pending"} spinner text='Загрузка активности...'>
									<UserLogBlock logs={userFriendsLogs} onChangePage={(pageNumber) => requestUserFriendsLogs(userID, pageNumber, LOG_ROWS_COUNT)} showUsername={true} />
								</LoadingOverlay>
							</div>
						</MDBCol>
						<MDBCol md='0.5'></MDBCol>
					</MDBRow>
				</MDBContainer>
			</LoadingOverlay>
		</div>
	);
});

export default UserPage;
