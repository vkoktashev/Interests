import axios from "axios";
import { USER_INFO_URL, SEARCH_USERS_URL, USER_CALENDAR_URL } from "../settings";

axios.defaults.headers.common = {
	"Content-Type": "application/json;charset=UTF-8",
};

/**
 * Запрос к бд, получающий информацию о пользователе
 * @param {string} token Токен доступа
 * @param {string} userID ID пользователя
 * @returns {object} Информация о пользователе
 */
export async function getUserInfo(token, userID) {
	let data;
	try {
		if (token) {
			var AuthStr = "Bearer " + token;
			const res = await axios.get(USER_INFO_URL + userID + "/", { headers: { Authorization: AuthStr } });
			data = res.data;
		} else {
			const res = await axios.get(USER_INFO_URL + userID + "/");
			data = res.data;
		}
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на поиск пользователей
 * @param {string} query Поисковый запрос
 */
export async function searchUsers(query) {
	try {
		const res = await axios.get(SEARCH_USERS_URL, { params: { query: query } });
		return res.data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на изменение статуса пользовтеля (добавить в друзья и тд)
 * @param {string} token Токен доступа
 * @param {boolean} is_following Статус фильма
 * @param {string} userID ID пользовтеля
 */
export async function setUserStatus(token, is_following, userID) {
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.put(USER_INFO_URL + userID + "/follow/", is_following, { headers: { Authorization: AuthStr } });
		if (res.status === 204 || res.status === 200 || res.status === 201) return res.data;
		else return null;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий лог пользователя
 * @param {string} userID ID пользователя
 * @param {string} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function getUserLog(token, userID, page, resultsOnPage) {
	let data;
	try {
		if (token) {
			var AuthStr = "Bearer " + token;
			const res = await axios.get(USER_INFO_URL + userID + "/log/", { params: { page: page, page_size: resultsOnPage } }, { headers: { Authorization: AuthStr } });
			data = res.data;
		} else {
			const res = await axios.get(USER_INFO_URL + userID + "/log/", { params: { page: page, page_size: resultsOnPage } });
			data = res.data;
		}
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий лог друзей пользователя
 * @param {string} userID ID пользователя
 * @param {int} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function getUserFriendsLog(token, userID, page, resultsOnPage) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(USER_INFO_URL + userID + "/friends_log/", { params: { page: page, page_size: resultsOnPage }, headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий календарь релизов пользователя
 */
export async function getUserCalendar(token) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(USER_CALENDAR_URL, { headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
		/*return {
			"2021-02-01": {
				games: [
					{
						id: 572,
						rawg_name: "В тылу врага 2: Братья по оружию",
						rawg_slug: "2-28",
						rawg_id: 37986,
						hltb_name: "",
						hltb_id: null,
					},
					{
						id: 572,
						rawg_name: "Minecraft: Dungeons",
						rawg_slug: "minecraft-dungeons",
						rawg_id: 257195,
						hltb_name: "",
						hltb_id: null,
					},
				],
				movies: [
					{
						id: 309,
						imdb_id: "tt1630029",
						tmdb_id: 76600,
						tmdb_original_name: "Avatar 2",
						tmdb_name: "Аватар 2",
						tmdb_runtime: 0,
					},
				],
				episodes: [
					{
						show_name: "Теория  большого взрыва",
						show_id: 1418,
						season_number: 0,
						episode_number: 1,
						id: 64739,
						name: "Эпизод 1",
					},
				],
			},
		};*/
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}
