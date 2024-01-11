/**Адрес сервера*/
// export const BACKEND_URL = "http://localhost:8000/";
export const BACKEND_URL = "https://your-interests.ru/api/";
/**Адрес получения токена */
export const GET_TOKEN_URL = BACKEND_URL + "users/auth/login/";
/**Адрес обновления токена */
export const REFRESH_TOKEN_URL = BACKEND_URL + "users/auth/refresh-token/";
/**Адрес регистрации */
export const REGISTRATE_URL = BACKEND_URL + "users/auth/signup/";
/**Адрес подтверждения почты */
export const CONFIRM_URL = BACKEND_URL + "users/auth/confirm_email/";
/**Адрес сброса пароля */
export const RESET_PASSWORD_URL = BACKEND_URL + "users/auth/password_reset/";
/**Адрес подтверждения сброса пароля */
export const CONFIRM_PASSWORD_URL = BACKEND_URL + "users/auth/confirm_password_reset/";
/**Адрес запроса игры */
export const GET_GAME_URL = "games/game/";
/**Адрес поиска игр */
export const SEARCH_GAMES_URL = "games/search/rawg/";
/**Адрес быстрого поиска игр */
export const SEARCH_GAMES_FAST_URL = "games/search/";
/**Адрес запроса фильма */
export const GET_MOVIE_URL = "movies/movie/";
/**Адрес поиска фильмов */
export const SEARCH_MOVIES_URL = "movies/search/tmdb/";
/**Адрес быстрого поиска игр */
export const SEARCH_MOVIES_FAST_URL = "movies/search/";
/**Адрес запроса сериала */
export const GET_SHOW_URL = "shows/show/";
/**Адрес поиска сериалов */
export const SEARCH_SHOWS_URL = "shows/search/tmdb/";
/**Адрес юыстрого поиска сериалов */
export const SEARCH_SHOWS_FAST_URL = "shows/search/";
/**Адрес запроса непросмотренных серий */
export const GET_UNWATCHED_EPISODES_URL = "shows/show/unwatched_episodes/";
/**Адрес получения информации о пользователе */
export const USER_INFO_URL = "users/user/";
/**Адрес получения календаря релизов пользователя */
export const USER_CALENDAR_URL = "users/user/release_calendar/";
/**Адрес поиска пользователей */
export const SEARCH_USERS_URL = "users/search/";
/**Адрес сохранения настроек */
export const USER_SETTINGS_URL = "users/user/user_settings/";
