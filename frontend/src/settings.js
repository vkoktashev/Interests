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
export const CONFIRM_URL = BACKEND_URL + "users/auth/confirm_email/";
/**Адрес сброса пароля */
export const RESET_PASSWORD_URL = BACKEND_URL + "users/user/password_reset/"; 
/**Адрес подтверждения сброса пароля */
export const CONFIRM_PASSWORD_URL = BACKEND_URL + "users/user/confirm_password_reset/";
/**Адрес запроса игры */
export const GET_GAME_URL = BACKEND_URL + "games/game/";
/**Адрес поиска игр */
export const SEARCH_GAMES_URL = BACKEND_URL + "games/search/";
/**Адрес запроса фильма */
export const GET_MOVIE_URL = BACKEND_URL + "movies/movie/";
/**Адрес поиска фильмов */
export const SEARCH_MOVIES_URL = BACKEND_URL + "movies/search/";
/**Адрес поиска сериалов */
export const SEARCH_SHOWS_URL = BACKEND_URL + "shows/search/";
/**Адрес получения информации о пользователе */
export const USER_INFO_URL = BACKEND_URL + "users/user/";
/**Адрес поиска пользователей */
export const SEARCH_USERS_URL = BACKEND_URL + "users/search/"; 
