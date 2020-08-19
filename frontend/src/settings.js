/** Время жизни токена в миллисекундах, после истечения которого будет запрошен новый токен*/
export const TOKEN_LIFETIME = 86000000; 
/**Адрес сервера*/
export const BACKEND_URL = "http://127.0.0.1:8000/";
/**Адрес получения токена */
export const GET_TOKEN_URL = BACKEND_URL + "users/auth/login"; 
/**Адрес обновления токена */
export const REFRESH_TOKEN_URL = BACKEND_URL + "users/auth/refresh-token";
/**Адрес регистрации */
export const REGISTRATE_URL = BACKEND_URL + "users/auth/signup";
/**Адрес запроса игры */
export const GET_GAME_URL = BACKEND_URL + "games/game/";