import axios from "axios";
import { SEARCH_MOVIES_URL, SEARCH_MOVIES_FAST_URL, GET_MOVIE_URL } from "../settings";

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
	if (token) {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_MOVIE_URL + id + "/", { headers: { Authorization: AuthStr } });
		data = res.data;
	} else {
		const res = await axios.get(GET_MOVIE_URL + id + "/");
		data = res.data;
	}
	return data;
}

/**
 * Запрос на изменение статуса фильма
 * @param {string} token Токен доступа
 * @param {object} user_info Статус фильма
 * @param {string} movieID ID фильма
 */
export async function setMovieStatus(token, id, user_info) {
	var AuthStr = "Bearer " + token;
	const res = await axios.put(GET_MOVIE_URL + id + "/", user_info, { headers: { Authorization: AuthStr } });
	return res.data;
}

/**
 * Запрос на поиск фильмов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchMovies(query, page) {
	const res = await axios.get(SEARCH_MOVIES_URL, { params: { query: query, page: page } });
	return res.data;
}

/**
 * Запрос на поиск локальных фильмов
 * @param {string} query Поисковый запрос
 */
export async function searchMoviesFast(query) {
	const res = await axios.get(SEARCH_MOVIES_FAST_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для фильма
 * @param {string} id id фильма
 */
export async function getMovieUserInfo(token, id) {
	let data;
	var AuthStr = "Bearer " + token;
	const res = await axios.get(GET_MOVIE_URL + id + "/user_info/", { headers: { Authorization: AuthStr } });
	data = res.data;
	return data;
}
