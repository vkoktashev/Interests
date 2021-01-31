import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MDBRow, MDBCol, MDBContainer } from "mdbreact";
import { PieChart, Pie, Legend, Cell, Tooltip } from "recharts";
import { COLORS } from "./Colors";
import "./style.css";

import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";

import LoadingOverlay from "react-loading-overlay";
import CalendarBlock from "./Calendar/CalendarBlock";
import GameBlock from "./GameBlock";
import FriendBlock from "./FriendBlock";
import MovieBlock from "./MovieBlock";
import UserLogBlock from "./UserLogBlock";
import CategoriesTab from "../Common/CategoriesTab";
import ShowBlock from "./ShowBlock";

const LOG_ROWS_COUNT = 20;

//const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#FA8542'];

/**
 * Основная страница приложения
 */
function UserPage({
	loggedIn,
	userInfo,
	userIsLoading,
	getUserInfo,
	currentUserInfo,
	setUserStatus,
	getUserLogs,
	userLogs,
	userLogsIsLoading,
	getUserFriendsLogs,
	userFriendsLogs,
	userFriendsLogsIsLoading,
	getUserCalendar,
	userCalendar,
}) {
	let { userID, section } = useParams();
	const [activeCategory, setActiveCategory] = useState("");
	const [lastActivity, setLastActivity] = useState("");
	const [chartData, setChartData] = useState([]);

	useEffect(
		() => {
			getUserInfo(userID);
			getUserLogs(userID, 1, LOG_ROWS_COUNT);
		},
		// eslint-disable-next-line
		[userID, getUserInfo, getUserLogs, getUserFriendsLogs]
	);

	useEffect(
		() => {
			if (section) setActiveCategory(section);
			else setActiveCategory("Профиль");
		},
		// eslint-disable-next-line
		[section]
	);

	useEffect(
		() => {
			if (loggedIn) {
				getUserFriendsLogs(userID, 1, LOG_ROWS_COUNT);
				if (String(currentUserInfo.id) === userID) {
					getUserCalendar();
				}
			}
		},
		// eslint-disable-next-line
		[loggedIn, userID]
	);

	useEffect(() => {
		setChartData([]);
		document.title = "Профиль " + userInfo.username;
		if (userInfo.stats.games) {
			let newData = [];
			if (userInfo.stats.games.total_spent_time > 0) newData.push({ name: "Часов в играх", value: userInfo.stats.games.total_spent_time });
			if (userInfo.stats.movies.total_spent_time > 0) newData.push({ name: "Часов в фильмах", value: userInfo.stats.movies.total_spent_time });
			if (userInfo.stats.episodes.total_spent_time > 0) newData.push({ name: "Часов в сериалах", value: userInfo.stats.episodes.total_spent_time });
			setChartData(newData);
		}
		if (userInfo.last_activity) {
			let date = new Date(userInfo.last_activity);
			Date.now();
			setLastActivity(date.toLocaleString());
		} else setLastActivity("");
	}, [userInfo]);

	return (
		<div>
			<div className='bg searchBG' />
			<LoadingOverlay active={userIsLoading} spinner text='Загрузка...'>
				<MDBContainer>
					<MDBRow>
						<MDBCol md='0.5'></MDBCol>
						<MDBCol className='userPage'>
							<h1>Информация о пользователе {userInfo.username}</h1>
							<p>Последняя активность {lastActivity}</p>
							<button
								hidden={currentUserInfo.username === userInfo.username}
								className='addFriendButton'
								onClick={() => {
									setUserStatus({ is_following: userInfo.is_followed ? false : true }, userInfo.id);
								}}>
								{userInfo.is_followed ? "Отписаться" : "Подписаться"}
							</button>
							<CategoriesTab
								categories={["Профиль", "Игры", "Фильмы", "Сериалы", "Друзья", currentUserInfo.username === userInfo.username ? "Календарь" : undefined]}
								activeColor='#7654de'
								activeCategory={activeCategory}
								onChangeCategory={(category) => {
									setActiveCategory(category);
								}}
								hidden={section}
							/>

							<div hidden={activeCategory !== "Профиль"}>
								<h4>Моя активность: </h4>
								<LoadingOverlay active={userLogsIsLoading} spinner text='Загрузка активности...'>
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
									<UserLogBlock logs={userLogs} onChangePage={(pageNumber) => getUserLogs(userID, pageNumber, LOG_ROWS_COUNT)} />
								</LoadingOverlay>
							</div>
							<div hidden={activeCategory !== "Игры"}>
								<GameBlock games={userInfo.games} stats={userInfo.stats.games} />
							</div>
							<div hidden={activeCategory !== "Фильмы"}>
								<MovieBlock movies={userInfo.movies} stats={userInfo.stats.movies} />
							</div>
							<div hidden={activeCategory !== "Сериалы"}>
								<ShowBlock shows={userInfo.shows} stats={userInfo.stats.episodes} />
							</div>
							<div hidden={activeCategory !== "Друзья"}>
								<FriendBlock users={userInfo.followed_users ? userInfo.followed_users : []} />
								<h4>Активность друзей: </h4>
								<LoadingOverlay active={userFriendsLogsIsLoading} spinner text='Загрузка активности...'>
									<UserLogBlock logs={userFriendsLogs} onChangePage={(pageNumber) => getUserFriendsLogs(userID, pageNumber, LOG_ROWS_COUNT)} showUsername={true} />
								</LoadingOverlay>
							</div>
							<div hidden={activeCategory !== "Календарь"}>
								<CalendarBlock calendar={userCalendar} />
							</div>
						</MDBCol>
						<MDBCol md='0.5'></MDBCol>
					</MDBRow>
				</MDBContainer>
			</LoadingOverlay>
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	userIsLoading: selectors.getIsLoadingUserPageContent(state),
	userInfo: selectors.getUserPageContent(state),
	userLogs: selectors.getUserPageLogs(state),
	userLogsIsLoading: selectors.getIsLoadingUserPageLogs(state),
	userFriendsLogs: selectors.getUserPageFriendsLogs(state),
	userFriendsLogsIsLoading: selectors.getIsLoadingUserPageFriendsLogs(state),
	currentUserInfo: selectors.getUser(state),
	userCalendar: selectors.getUserPageCalendar(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		openLoginForm: () => {
			dispatch(actions.openLoginForm());
		},
		getUserInfo: (user_id) => {
			dispatch(actions.requestUserPageContent(user_id));
		},
		setUserStatus: (is_following, userID) => {
			dispatch(actions.setUserStatus(is_following, userID));
		},
		getUserLogs: (userID, page, resultsOnPage) => {
			dispatch(actions.requestUserPageLogs(userID, page, resultsOnPage));
		},
		getUserFriendsLogs: (userID, page, resultsOnPage) => {
			dispatch(actions.requestUserPageFriendsLogs(userID, page, resultsOnPage));
		},
		getUserCalendar: () => {
			dispatch(actions.requestUserPageCalendar());
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(UserPage);
