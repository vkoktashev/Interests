import axios from "axios";
import { SEARCH_MOVIES_URL, GET_MOVIE_URL } from "../settings";

axios.defaults.headers.common = {
	"Content-Type": "application/json;charset=UTF-8",
};

/**
 * Запрос к бд, получающий информацию о фильме
 * @param {string} token Токен доступа
 * @param {string} id ID фильма
 * @returns {object} Информация о фильме
 */
export async function getMovie(token, id) {
	let data;
	try {
		if (token) {
			var AuthStr = "Bearer " + token;
			const res = await axios.get(GET_MOVIE_URL + id + "/", { headers: { Authorization: AuthStr } });
			data = res.data;
		} else {
			const res = await axios.get(GET_MOVIE_URL + id + "/");
			data = res.data;
		}
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на изменение статуса фильма
 * @param {string} token Токен доступа
 * @param {object} user_info Статус фильма
 * @param {string} movieID ID фильма
 */
export async function setMovieStatus(token, id, user_info) {
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.put(GET_MOVIE_URL + id + "/", user_info, { headers: { Authorization: AuthStr } });
		if (res.status === 204 || res.status === 200 || res.status === 201) return res.data;
		else return null;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос на поиск фильмов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchMovies(query, page) {
	try {
		const res = await axios.get(SEARCH_MOVIES_URL, { params: { query: query, page: page } });
		return res.data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для фильма
 * @param {string} id id фильма
 */
export async function getMovieUserInfo(token, id) {
	let data;
	try {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_MOVIE_URL + id + "/user_info/", { headers: { Authorization: AuthStr } });
		data = res.data;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e);
		return null;
	}
}
