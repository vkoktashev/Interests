import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import UserStore from "../../store/UserStore";

import { MDBRow, MDBCol, MDBContainer } from "mdbreact";
import { PieChart, Pie, Legend, Cell, Tooltip } from "recharts";
import { COLORS } from "./Colors";
import "./style.css";

import LoadingOverlay from "react-loading-overlay";
import GameBlock from "./GameBlock";
import FriendBlock from "./FriendBlock";
import MovieBlock from "./MovieBlock";
import UserLogBlock from "./UserLogBlock";
import CategoriesTab from "../Common/CategoriesTab";
import ShowBlock from "./ShowBlock";

const LOG_ROWS_COUNT = 20;

/**
 * Основная страница приложения
 */
const UserPage = observer((props) => {
	const auth = AuthStore;
	const { user, userIsLoading, requestUser, setUserStatus, requestUserLogs, userLogs, userLogsIsLoading, requestUserFriendsLogs, userFriendsLogs, userFriendsLogsIsLoading } = UserStore;

	let { userID } = useParams();
	const [activeCategory, setActiveCategory] = useState("Профиль");
	const [lastActivity, setLastActivity] = useState("");
	const [chartData, setChartData] = useState([]);

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
			if (auth.loggedIn) {
				requestUserFriendsLogs(userID, 1, LOG_ROWS_COUNT);
			}
		},
		// eslint-disable-next-line
		[auth.loggedIn, userID]
	);

	useEffect(() => {
		setChartData([]);
		document.title = "Профиль " + user.username;
		if (user.stats.games) {
			let newData = [];
			if (user.stats.games.total_spent_time > 0) newData.push({ name: "Часов в играх", value: user.stats.games.total_spent_time });
			if (user.stats.movies.total_spent_time > 0) newData.push({ name: "Часов в фильмах", value: user.stats.movies.total_spent_time });
			if (user.stats.episodes.total_spent_time > 0) newData.push({ name: "Часов в сериалах", value: user.stats.episodes.total_spent_time });
			setChartData(newData);
		}
		if (user.last_activity) {
			let date = new Date(user.last_activity);
			Date.now();
			setLastActivity(date.toLocaleString());
		} else setLastActivity("");
	}, [user]);

	return (
		<div>
			<div className='bg searchBG' />
			<LoadingOverlay active={userIsLoading} spinner text='Загрузка...'>
				<MDBContainer>
					<MDBRow>
						<MDBCol md='0.5'></MDBCol>
						<MDBCol className='userPage'>
							<h1>Информация о пользователе {user.username}</h1>
							<p>Последняя активность {lastActivity}</p>
							<button
								hidden={auth.user.username === user.username}
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
								<LoadingOverlay active={userLogsIsLoading && !userIsLoading} spinner text='Загрузка активности...'>
									<div hidden={chartData.length < 1}>
										<PieChart width={350} height={250} hidden={chartData.length < 1}>
											<Pie dataKey='value' data={chartData} cx='50%' cy='50%' outerRadius={80} fill='#8884d8' labelLine={true} label minAngle={5}>
												{chartData.map((entry, index) => (
													<Cell fill={COLORS[index]} key={index} />
												))}
											</Pie>
											<Tooltip
												itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
												contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
												cursor={false}
											/>
											<Legend verticalAlign='bottom' horizontalAlign='center' />
										</PieChart>
									</div>
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
								<LoadingOverlay active={userFriendsLogsIsLoading && !userIsLoading} spinner text='Загрузка активности...'>
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
