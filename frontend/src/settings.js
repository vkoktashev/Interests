/** Время жизни токена в миллисекундах, после истечения которого будет запрошен новый токен*/
export const TOKEN_LIFETIME = 86000000; 
/**Адрес сервера*/
export const BACKEND_URL = "http://35.193.124.214:8001/";
/**Адрес получения токена */
export const GET_TOKEN_URL = BACKEND_URL + "users/auth/login/"; 
/**Адрес обновления токена */
export const REFRESH_TOKEN_URL = BACKEND_URL + "users/auth/refresh-token/";
/**Адрес регистрации */
export const REGISTRATE_URL = BACKEND_URL + "users/auth/signup/";
/**Адрес подтверждения почты */
export const CONFIRM_URL = BACKEND_URL + "users/auth/confirmation/";
/**Адрес запроса игры */
export const GET_GAME_URL = BACKEND_URL + "games/game/";
/**Адрес поиска игр */
export const SEARCH_GAMES_URL = BACKEND_URL + "games/search/";
/**Адрес получения информации о пользователе */
export const USER_INFO_URL = BACKEND_URL + "users/user/";