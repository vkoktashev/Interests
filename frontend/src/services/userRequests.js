import axios from "axios";
import { USER_INFO_URL, SEARCH_USERS_URL, USER_CALENDAR_URL, USER_SETTINGS_URL } from "../settings";

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
	if (token) {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(USER_INFO_URL + userID + "/", { headers: { Authorization: AuthStr } });
		data = res.data;
	} else {
		const res = await axios.get(USER_INFO_URL + userID + "/");
		data = res.data;
	}
	return data;
}

/**
 * Запрос на поиск пользователей
 * @param {string} query Поисковый запрос
 */
export async function searchUsers(query) {
	const res = await axios.get(SEARCH_USERS_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос на изменение статуса пользовтеля (добавить в друзья и тд)
 * @param {string} token Токен доступа
 * @param {boolean} is_following Статус фильма
 * @param {string} userID ID пользовтеля
 */
export async function setUserStatus(token, is_following, userID) {
	var AuthStr = "Bearer " + token;
	const res = await axios.put(USER_INFO_URL + userID + "/follow/", is_following, { headers: { Authorization: AuthStr } });
	if (res.status === 204 || res.status === 200 || res.status === 201) return res.data;
	else return null;
}

/**
 * Запрос к бд, получающий лог пользователя
 * @param {string} userID ID пользователя
 * @param {string} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function getUserLog(token, userID, page, resultsOnPage) {
	let data;
	if (token) {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(USER_INFO_URL + userID + "/log/", { params: { page: page, page_size: resultsOnPage } }, { headers: { Authorization: AuthStr } });
		data = res.data;
	} else {
		const res = await axios.get(USER_INFO_URL + userID + "/log/", { params: { page: page, page_size: resultsOnPage } });
		data = res.data;
	}
	return data;
}

/**
 * Запрос к бд, получающий лог друзей пользователя
 * @param {string} userID ID пользователя
 * @param {int} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function getUserFriendsLog(token, userID, page, resultsOnPage) {
	let data;
	var AuthStr = "Bearer " + token;
	const res = await axios.get(USER_INFO_URL + userID + "/friends_log/", { params: { page: page, page_size: resultsOnPage }, headers: { Authorization: AuthStr } });
	data = res.data;
	return data;
}

/**
 * Запрос к бд, получающий календарь релизов пользователя
 */
export async function getUserCalendar(token) {
	let data;
	var AuthStr = "Bearer " + token;
	const res = await axios.get(USER_CALENDAR_URL, { headers: { Authorization: AuthStr } });
	data = res.data;
	return data;
}

/**
 * Запрос к бд, получающий настройки пользователя
 */
export async function getUserSettings(token) {
	let data;
	var AuthStr = "Bearer " + token;
	const res = await axios.get(USER_SETTINGS_URL, { headers: { Authorization: AuthStr } });
	data = res.data;
	return data;
}

/**
 * Запрос к бд, изменяющий настройки пользователя
 */
export async function patchUserSettings(token, settings) {
	let data;
	var AuthStr = "Bearer " + token;
	const res = await axios.patch(USER_SETTINGS_URL, settings, { headers: { Authorization: AuthStr } });
	data = res.data;
	return data;
}
