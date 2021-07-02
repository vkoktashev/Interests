import api from "../http";
import { SEARCH_SHOWS_URL, SEARCH_SHOWS_FAST_URL, GET_SHOW_URL, GET_UNWATCHED_EPISODES_URL } from "../settings";

/**
 * Запрос к бд, получающий информацию о сериале
 * @param {string} id ID сериала
 * @returns {object} Информация о сериале
 */
export async function getShow(id) {
	const res = await api.get(GET_SHOW_URL + id + "/");
	return res.data;
}

/**
 * Запрос к бд, получающий информацию о сезоне сериала
 * @param {string} showID ID сериала
 *  * @param {string} seasonNumber номер сезона
 * @returns {object} Информация о сериале
 */
export async function getShowSeason(showID, seasonNumber) {
	const res = await api.get(GET_SHOW_URL + showID + "/season/" + seasonNumber);
	return res.data;
}

/**
 * Запрос к бд, получающий информацию о серии сериала
 * @param {string} showID ID сериала
 * @param {string} seasonNumber номер сезона
 * @param {string} episodeNumber номер эпизода
 * @returns {object} Информация о сериале
 */
export async function getShowEpisode(showID, seasonNumber, episodeNumber) {
	const res = await api.get(GET_SHOW_URL + showID + "/season/" + seasonNumber + "/episode/" + episodeNumber);
	return res.data;
}

/**
 * Запрос на изменение статуса сериала
 * @param {object} user_info Статус сериала
 * @param {string} id ID сериала
 */
export async function setShowStatus(id, user_info) {
	const res = await api.put(GET_SHOW_URL + id + "/", user_info);
	return res.data;
}

/**
 * Запрос на изменение статуса сезона сериала
 * @param {object} user_info Статус сезона сериала
 * @param {string} showID ID сериала
 *  * @param {string} seasonNumber номер сезона
 */
export async function setShowSeasonStatus(showID, seasonNumber, user_info) {
	const res = await api.put(GET_SHOW_URL + showID + "/season/" + seasonNumber + "/", user_info);
	return res.data;
}

/**
 * Запрос на изменение статуса сезона сериала
 * @param {object} episodesList Список объектов эпизодов
 * @param {string} showID ID сериала
 */
export async function setShowEpisodesStatus(showID, episodesList) {
	const res = await api.put(GET_SHOW_URL + showID + "/episodes/", episodesList);
	return res;
}

/**
 * Запрос на поиск сериалов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchShows(query, page) {
	const res = await api.get(SEARCH_SHOWS_URL, { params: { query: query, page: page } });
	return res.data;
}

/**
 * Запрос на поиск локальных сериалов
 * @param {string} query Поисковый запрос
 */
export async function searchShowsFast(query) {
	const res = await api.get(SEARCH_SHOWS_FAST_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для сериала
 * @param {string} showID id сериала
 */
export async function getShowUserInfo(showID) {
	const res = await api.get(GET_SHOW_URL + showID + "/user_info/");
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для сезона сериала
 * @param {string} showID id сериала
 */
export async function getShowSeasonUserInfo(showID, seasonID) {
	const res = await api.get(GET_SHOW_URL + showID + "/season/" + seasonID + "/user_info/");
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для эпизода сериала
 * @param {string} showID id сериала
 * @param {int} page страница
 */
export async function getShowEpisodeUserInfo(showID, seasonID, episodeID) {
	const res = await api.get(GET_SHOW_URL + showID + "/season/" + seasonID + "/episode/" + episodeID + "/user_info/");
	return res.data;
}

/**
 * Запрос к бд, получающий информацию о сериале
 * @returns {Array} Список эпизодов
 */
export async function getUnwatchedEpisodes() {
	const res = await api.get(GET_UNWATCHED_EPISODES_URL);
	return res.data;
}
