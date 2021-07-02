import api from "../http";
import { GET_GAME_URL, SEARCH_GAMES_URL, SEARCH_GAMES_FAST_URL } from "../settings";

api.defaults.headers.common = {
	"Content-Type": "application/json;charset=UTF-8",
};

/**
 * Запрос к бд, получающий информацию об игре
 * @param {string} id ID игры
 * @returns {object} Информация об игре
 */
export async function getGame(id) {
	const res = await api.get(GET_GAME_URL + id + "/");
	return res.data;
}

/**
 * Запрос на изменение статуса игры
 * @param {object} user_info Статус игры
 * @param {string} gameSlug Слаг игры
 */
export async function setGameStatus(gameSlug, user_info) {
	const res = await api.put(GET_GAME_URL + gameSlug + "/", user_info);
	return res.data;
}

/**
 * Запрос на поиск игр
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchGames(query, page, gamesCount) {
	const res = await api.get(SEARCH_GAMES_URL, { params: { query: query, page: page, page_size: gamesCount } });
	return res.data;
}

/**
 * Запрос на поиск локльных игр
 * @param {string} query Поисковый запрос
 */
export async function searchGamesFast(query) {
	const res = await api.get(SEARCH_GAMES_FAST_URL, { params: { query: query } });
	return res.data;
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для игры
 * @param {string} slug slug игры
 * @param {int} page страница
 */
export async function getGameUserInfo(slug) {
	const res = await api.get(GET_GAME_URL + slug + "/user_info/");
	return res.data;
}
