import api from "../http";
import { SEARCH_MOVIES_URL, SEARCH_MOVIES_FAST_URL, GET_MOVIE_URL } from "../settings";

/**
 * Запрос к бд, получающий информацию о фильме
 * @param {number} id ID фильма
 */
export async function getMovie(id) {
	const res = await api.get(GET_MOVIE_URL + id + "/");
	return res.data;
}

/**
 * Запрос на изменение статуса фильма
 * @param {object} user_info Статус фильма
 * @param {string} movieID ID фильма
 */
export async function setMovieStatus(id, user_info) {
	const res = await api.put(GET_MOVIE_URL + id + "/", user_info);
	return res.data;
}

/**
 * Запрос на поиск фильмов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchMovies(query, page) {
	const res = await api.get(SEARCH_MOVIES_URL, { params: { query: query, page: page } });
	return res.data;
}

/**
 * Запрос на поиск локальных фильмов
 * @param {string} query Поисковый запрос
 */
export async function searchMoviesFast(query) {
	const res = await api.get(SEARCH_MOVIES_FAST_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для фильма
 * @param {number} id id фильма
 */
export async function getMovieUserInfo(id) {
	const res = await api.get(GET_MOVIE_URL + id + "/user_info/");
	return res.data;
}
