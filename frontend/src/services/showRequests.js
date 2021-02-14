import axios from "axios";
import { SEARCH_SHOWS_URL, GET_SHOW_URL, GET_UNWATCHED_EPISODES_URL } from "../settings";

axios.defaults.headers.common = {
	"Content-Type": "application/json;charset=UTF-8",
};

/**
 * Запрос к бд, получающий информацию о сериале
 * @param {string} token Токен доступа
 * @param {string} id ID сериала
 * @returns {object} Информация о сериале
 */
export async function getShow(token, id) {
	let data;
	try {
		if (token) {
			var AuthStr = "Bearer " + token;
			const res = await axios.get(GET_SHOW_URL + id + "/", { headers: { Authorization: AuthStr } });
			data = res.data;
		} else {
			const res = await axios.get(GET_SHOW_URL + id + "/");
			data = res.data;
		}
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию о сезоне сериала
 * @param {string} token Токен доступа
 * @param {string} showID ID сериала
 *  * @param {string} seasonNumber номер сезона
 * @returns {object} Информация о сериале
 */
export async function getShowSeason(token, showID, seasonNumber) {
	let data;
	try {
		if (token) {
			var AuthStr = "Bearer " + token;
			const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonNumber, { headers: { Authorization: AuthStr } });
			data = res.data;
		} else {
			const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonNumber);
			data = res.data;
		}
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию о серии сериала
 * @param {string} token Токен доступа
 * @param {string} showID ID сериала
 * @param {string} seasonNumber номер сезона
 * @param {string} episodeNumber номер эпизода
 * @returns {object} Информация о сериале
 */
export async function getShowEpisode(token, showID, seasonNumber, episodeNumber) {
	let data;
	try {
		if (token) {
			var AuthStr = "Bearer " + token;
			const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonNumber + "/episode/" + episodeNumber, { headers: { Authorization: AuthStr } });
			data = res.data;
		} else {
			const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonNumber + "/episode/" + episodeNumber);
			data = res.data;
		}
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на изменение статуса сериала
 * @param {string} token Токен доступа
 * @param {object} user_info Статус сериала
 * @param {string} id ID сериала
 */
export async function setShowStatus(token, id, user_info) {
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.put(GET_SHOW_URL + id + "/", user_info, { headers: { Authorization: AuthStr } });
		if (res.status === 204 || res.status === 200 || res.status === 201) return res.data;
		else return null;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на изменение статуса сезона сериала
 * @param {string} token Токен доступа
 * @param {object} user_info Статус сезона сериала
 * @param {string} showID ID сериала
 *  * @param {string} seasonNumber номер сезона
 */
export async function setShowSeasonStatus(token, showID, seasonNumber, user_info) {
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.put(GET_SHOW_URL + showID + "/season/" + seasonNumber + "/", user_info, { headers: { Authorization: AuthStr } });
		if (res.status === 204 || res.status === 200 || res.status === 201) return res.data;
		else return null;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на изменение статуса сезона сериала
 * @param {string} token Токен доступа
 * @param {object} episodesList Список объектов эпизодов
 * @param {string} showID ID сериала
 */
export async function setShowEpisodesStatus(token, showID, episodesList) {
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.put(GET_SHOW_URL + showID + "/episodes/", episodesList, { headers: { Authorization: AuthStr } });
		return res;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на поиск сериалов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchShows(query, page) {
	try {
		const res = await axios.get(SEARCH_SHOWS_URL, { params: { query: query, page: page } });
		return res.data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для сериала
 * @param {string} showID id сериала
 */
export async function getShowUserInfo(token, showID) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_SHOW_URL + showID + "/user_info/", { headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для сезона сериала
 * @param {string} showID id сериала
 */
export async function getShowSeasonUserInfo(token, showID, seasonID) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonID + "/user_info/", { headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для эпизода сериала
 * @param {string} showID id сериала
 * @param {int} page страница
 */
export async function getShowEpisodeUserInfo(token, showID, seasonID, episodeID) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonID + "/episode/" + episodeID + "/user_info/", { headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию о сериале
 * @param {string} token Токен доступа
 * @returns {Array} Список эпизодов
 */
export async function getUnwatchedEpisodes(token) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_UNWATCHED_EPISODES_URL, { headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}
