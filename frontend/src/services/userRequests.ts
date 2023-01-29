import api from '../http';
import { USER_INFO_URL, SEARCH_USERS_URL, USER_CALENDAR_URL, USER_SETTINGS_URL } from '../settings';

/**
 * Запрос к бд, получающий информацию о пользователе
 * @param {string} userID ID пользователя
 */
export async function getUserInfo(userID: string | number) {
	const res = await api.get(USER_INFO_URL + userID + '/');
	return res.data;
}

/**
 * Запрос на поиск пользователей
 * @param {string} query Поисковый запрос
 */
export async function searchUsers(query: string) {
	const res = await api.get(SEARCH_USERS_URL, { params: { query: query } });
	return res.data;
}

export async function setUserStatus(is_following: boolean, userID: string | number) {
	const res = await api.put(USER_INFO_URL + userID + '/follow/', is_following);
	return res.data;
}

export async function getUserLog(
	userID: string | number,
	page: number,
	resultsOnPage: number,
	query: string,
	filters: string[],
) {
	const res = await api.get(USER_INFO_URL + userID + '/log/', { params: { page: page, page_size: resultsOnPage, query: query, filters: filters } });
	return res.data;
}

export async function deleteUserLog(userID: string, logType: string, logID: string | number) {
	const res = await api.delete(USER_INFO_URL + userID + '/log/', { data: { type: logType, id: logID } });
	return res;
}

export async function getUserFriendsLog(
	page: string | number,
	resultsOnPage: number,
	query: string,
	filters: string[],
) {
	const res = await api.get(USER_INFO_URL + 'friends_log/', { params: { page: page, page_size: resultsOnPage, query: query, filters: filters } });
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
export async function patchUserSettings(settings: any) {
	const res = await api.patch(USER_SETTINGS_URL, settings);
	return res.data;
}

export async function getRoulette(params: {
	categories: string[],
	endedOnly: boolean,
}) {
	const response = await api.get('users/user/random/', {params: params});
	return response.data;
}
