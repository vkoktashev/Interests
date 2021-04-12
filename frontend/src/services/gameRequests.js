import axios from "axios";
import { GET_GAME_URL, SEARCH_GAMES_URL, SEARCH_GAMES_FAST_URL } from "../settings";

axios.defaults.headers.common = {
	"Content-Type": "application/json;charset=UTF-8",
};

/**
 * Запрос к бд, получающий информацию об игре
 * @param {string} token Токен доступа
 * @param {string} id ID игры
 * @returns {object} Информация об игре
 */
export async function getGame(token, id) {
	let data;
	if (token) {
		var AuthStr = "Bearer " + token;
		const res = await axios.get(GET_GAME_URL + id + "/", { headers: { Authorization: AuthStr } });
		data = res.data;
	} else {
		const res = await axios.get(GET_GAME_URL + id + "/");
		data = res.data;
	}
	return data;
}

/**
 * Запрос на изменение статуса игры
 * @param {string} token Токен доступа
 * @param {object} user_info Статус игры
 * @param {string} gameSlug Слаг игры
 */
export async function setGameStatus(token, gameSlug, user_info) {
	var AuthStr = "Bearer " + token;

	const res = await axios.put(GET_GAME_URL + gameSlug + "/", user_info, { headers: { Authorization: AuthStr } });

	return res.data;
}

/**
 * Запрос на поиск игр
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchGames(query, page, gamesCount) {
	const res = await axios.get(SEARCH_GAMES_URL, { params: { query: query, page: page, page_size: gamesCount } });
	return res.data;
}

/**
 * Запрос на поиск локльных игр
 * @param {string} query Поисковый запрос
 */
export async function searchGamesFast(query) {
	const res = await axios.get(SEARCH_GAMES_FAST_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для игры
 * @param {string} slug slug игры
 * @param {int} page страница
 */
export async function getGameUserInfo(token, slug) {
	var AuthStr = "Bearer " + token;
	const res = await axios.get(GET_GAME_URL + slug + "/user_info/", { headers: { Authorization: AuthStr } });
	return res.data;
}
