import api from "../http";
import { USER_INFO_URL, SEARCH_USERS_URL, USER_CALENDAR_URL, USER_SETTINGS_URL } from "../settings";

/**
 * Запрос к бд, получающий информацию о пользователе
 * @param {string} userID ID пользователя
 * @returns {object} Информация о пользователе
 */
export async function getUserInfo(userID) {
	const res = await api.get(USER_INFO_URL + userID + "/");
	return res.data;
}

/**
 * Запрос на поиск пользователей
 * @param {string} query Поисковый запрос
 */
export async function searchUsers(query) {
	const res = await api.get(SEARCH_USERS_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос на изменение статуса пользовтеля (добавить в друзья и тд)
 * @param {boolean} is_following Статус фильма
 * @param {string} userID ID пользовтеля
 */
export async function setUserStatus(is_following, userID) {
	const res = await api.put(USER_INFO_URL + userID + "/follow/", is_following);
	return res.data;
}

/**
 * Запрос к бд, получающий лог пользователя
 * @param {string} userID ID пользователя
 * @param {string} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function getUserLog(userID, page, resultsOnPage, query, filters) {
	const res = await api.get(USER_INFO_URL + userID + "/log/", { params: { page: page, page_size: resultsOnPage, query: query, filters: filters } });
	return res.data;
}

/**
 * Запрос к бд, получающий лог пользователя
 * @param {string} userID ID пользователя
 * @param {string} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function deleteUserLog(userID, logType, logID) {
	const res = await api.delete(USER_INFO_URL + userID + "/log/", { data: { type: logType, id: logID } });
	return res;
}

/**
 * Запрос к бд, получающий лог друзей пользователя
 * @param {string} userID ID пользователя
 * @param {int} page страница
 * @param {int} resultsOnPage количество результатов на странице
 */
export async function getUserFriendsLog(page, resultsOnPage, query, filters) {
	const res = await api.get(USER_INFO_URL + "friends_log/", { params: { page: page, page_size: resultsOnPage, query: query, filters: filters } });
	return res.data;
}

/**
 * Запрос к бд, получающий календарь релизов пользователя
 */
export async function getUserCalendar() {
	const res = await api.get(USER_CALENDAR_URL);
	return res.data;
}

/**
 * Запрос к бд, получающий настройки пользователя
 */
export async function getUserSettings() {
	const res = await api.get(USER_SETTINGS_URL);
	return res.data;
}

/**
 * Запрос к бд, изменяющий настройки пользователя
 */
export async function patchUserSettings(settings) {
	const res = await api.patch(USER_SETTINGS_URL, settings);
	return res.data;
}
