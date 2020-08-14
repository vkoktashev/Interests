/** Время жизни токена в миллисекундах, после истечения которого будет запрошен новый токен*/
export const TOKEN_LIFETIME = 450000; 
/**Адрес сервера*/
export const BACKEND_URL = "http://3847b8610c02.ngrok.io/";
/**Адрес получения токена */
export const GET_TOKEN_URL = BACKEND_URL + "users/auth/login"; 
/**Адрес обновления токена */
export const REFRESH_TOKEN_URL = BACKEND_URL + "users/auth/refresh-token";
/**Адрес регистрации */
export const REGISTRATE_URL = BACKEND_URL + "users/auth/signup";
/**Адрес запросы игры */
export const GET_GAME_URL = BACKEND_URL + "games/game/";