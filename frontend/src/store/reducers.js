import * as types from "./actionTypes";
import { Map } from "immutable";

// Создаем reducer с начальным состоянием.
const initialState = Map({
	auth: { loggedIn: false },
	user: { username: "", email: "", id: null },
	content: {
		game: {
			main_info: { rawg: { name: "", background_image: "", background_image_additional: "", developers: [{}] }, hltb: { game_image_url: "" } },
			user_info: { status: null, review: "", score: 0, spent_time: 0, friends_info: [] },
		},
		movie: { main_info: { tmdb: { title: "", poster_path: "", developers: [{}] } }, user_info: { status: null, review: "", score: 0, friends_info: [] } },
		show: { main_info: { tmdb: { title: "", poster_path: "", developers: [{}], episode_run_time: [] } }, user_info: { status: null, review: "", score: 0, friends_info: [] } },
		showSeasons: {},
	},
	searchContent: { games: [], movies: [], shows: [], users: [] },
	userPageContent: {
		user: { stats: {} },
		userLogs: { log: [] },
		userFriendsLogs: { log: [] },
	},
	userCalendar: {},
	userSettings: {},
	userUnwatched: [],
	openedPages: { LoginForm: false, RegistrateForm: false, ResetPasswordForm: false },
	errors: { auth: false, registrate: false, gameRequest: false, movieRequest: false, userPage: false, resetPassword: false, confirmPassword: false },
	isLoading: {
		contentGame: false,
		contentGameUserInfo: false,
		contentMovie: false,
		contentMovieUserInfo: false,
		contentShow: false,
		contentShowUserInfo: false,
		contentShowSeasons: {},
		userPageContent: false,
		userPageLogs: false,
		userPageFriendsLogs: false,
		userCalendar: false,
		userSettings: false,
		userUnwatched: false,
		searchGames: false,
		searchMovies: false,
		searchShows: false,
		searchUsers: false,
	},
});

export default function reducer(state = initialState, action) {
	switch (action.type) {
		//Редьюсеры пользовательской информации
		case types.SET_USER:
			return state.setIn(["user"], action.user);
		case types.SET_AUTH:
			return state.setIn(["auth"], action.auth);
		case types.SET_USER_CALENDAR:
			return state.setIn(["userCalendar"], action.data);
		case types.SET_USER_SETTINGS:
			return state.setIn(["userSettings"], action.data);
		case types.SET_USER_UNWATCHED:
			return state.setIn(["userUnwatched"], action.data);

		//Редьюсеры информации об игре
		case types.SET_CONTENT_GAME:
			return state.setIn(["content", "game", "main_info"], action.game);
		case types.SET_CONTENT_GAME_USER_INFO:
			return state.setIn(["content", "game", "user_info"], action.user_info);

		//Редьюсеры информации о фильме
		case types.SET_CONTENT_MOVIE:
			return state.setIn(["content", "movie", "main_info"], action.movie);
		case types.SET_CONTENT_MOVIE_USER_INFO:
			return state.setIn(["content", "movie", "user_info"], action.user_info);

		//Редьюсеры информации о сериале
		case types.SET_CONTENT_SHOW:
			return state.setIn(["content", "show", "main_info"], action.show);
		case types.SET_CONTENT_SHOW_USER_INFO:
			return state.setIn(["content", "show", "user_info"], action.user_info);

		//Редьюсеры информации о сезонах сериала
		case types.SET_CONTENT_SHOW_SEASONS:
			return state.setIn(["content", "showSeasons", action.seasonNumber, "main_info"], action.info);
		case types.SET_CONTENT_SHOW_SEASONS_USER_INFO:
			return state.setIn(["content", "showSeasons", action.seasonNumber, "user_info"], action.user_info);
		case types.SET_CONTENT_SHOW_SEASONS_EPISODE_SCORE:
			return state.setIn(["content", "showSeasons", action.seasonNumber, "user_info", "episodes", action.episodeNumber, "score"], action.score);

		//Редьюсеры результатов поиска
		case types.SET_SEARCH_CONTENT_GAMES:
			return state.setIn(["searchContent", "games"], action.games);
		case types.SET_SEARCH_CONTENT_MOVIES:
			return state.setIn(["searchContent", "movies"], action.movies);
		case types.SET_SEARCH_CONTENT_SHOWS:
			return state.setIn(["searchContent", "shows"], action.shows);
		case types.SET_SEARCH_CONTENT_USERS:
			return state.setIn(["searchContent", "users"], action.users);

		//Редьюсеры страницы профиля
		case types.SET_USER_PAGE_CONTENT:
			return state.setIn(["userPageContent", "user"], action.content);
		case types.SET_USER_PAGE_FOLLOWING:
			return state.setIn(["userPageContent", "user", "is_followed"], action.is_following);
		case types.SET_USER_PAGE_LOGs:
			return state.setIn(["userPageContent", "userLogs"], action.logs);
		case types.SET_USER_PAGE_FRIENDS_LOGS:
			return state.setIn(["userPageContent", "userFriendsLogs"], action.logs);

		//Редьюсеры состояния всплывающих окон
		case types.SET_LOGINFORM:
			return state.setIn(["openedPages", "LoginForm"], action.isOpen);
		case types.SET_REGISTRATEFORM:
			return state.setIn(["openedPages", "RegistrateForm"], action.isOpen);
		case types.SET_RESET_PASSWORD_FORM:
			return state.setIn(["openedPages", "ResetPasswordForm"], action.isOpen);

		//Редьюсеры ошибок
		case types.AUTH_ERROR:
			return state.setIn(["errors", "auth"], action.error);
		case types.REGISTRATE_ERROR:
			return state.setIn(["errors", "registrate"], action.error);
		case types.GAME_REQUEST_ERROR:
			return state.setIn(["errors", "gameRequest"], action.error);
		case types.MOVIE_REQUEST_ERROR:
			return state.setIn(["errors", "movieRequest"], action.error);
		case types.SHOW_REQUEST_ERROR:
			return state.setIn(["errors", "showRequest"], action.error);
		case types.USER_PAGE_ERROR:
			return state.setIn(["errors", "userPage"], action.error);
		case types.RESET_PASSWORD_ERROR:
			return state.setIn(["errors", "resetPassword"], action.error);
		case types.CONFIRM_PASSWORD_ERROR:
			return state.setIn(["errors", "confirmPassword"], action.error);

		//Редьюсеры состояния загрузки
		case types.SET_IS_LOADING_CONTENT_GAME:
			return state.setIn(["isLoading", "contentGame"], action.isLoading);
		case types.SET_IS_LOADING_CONTENT_GAME_USER_INFO:
			return state.setIn(["isLoading", "contentGameUserInfo"], action.isLoading);
		case types.SET_IS_LOADING_CONTENT_MOVIE:
			return state.setIn(["isLoading", "contentMovie"], action.isLoading);
		case types.SET_IS_LOADING_CONTENT_MOVIE_USER_INFO:
			return state.setIn(["isLoading", "contentMovieUserInfo"], action.isLoading);
		case types.SET_IS_LOADING_CONTENT_SHOW:
			return state.setIn(["isLoading", "contentShow"], action.isLoading);
		case types.SET_IS_LOADING_CONTENT_SHOW_USER_INFO:
			return state.setIn(["isLoading", "contentShowUserInfo"], action.isLoading);
		case types.SET_IS_LOADING_CONTENT_SHOW_SEASONS:
			return state.setIn(["isLoading", "contentShowSeasons", action.seasonNumber], action.isLoading);
		case types.SET_IS_LOADING_SEARCH_GAMES:
			return state.setIn(["isLoading", "searchGames"], action.isLoading);
		case types.SET_IS_LOADING_SEARCH_MOVIES:
			return state.setIn(["isLoading", "searchMovies"], action.isLoading);
		case types.SET_IS_LOADING_SEARCH_SHOWS:
			return state.setIn(["isLoading", "searchShows"], action.isLoading);
		case types.SET_IS_LOADING_SEARCH_USERS:
			return state.setIn(["isLoading", "searchUsers"], action.isLoading);
		case types.SET_IS_LOADING_USER_PAGE_CONTENT:
			return state.setIn(["isLoading", "userPageContent"], action.isLoading);
		case types.SET_IS_LOADING_USER_PAGE_LOGS:
			return state.setIn(["isLoading", "userPageLogs"], action.isLoading);
		case types.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS:
			return state.setIn(["isLoading", "userPageFriendsLogs"], action.isLoading);
		case types.SET_IS_LOADING_USER_CALENDAR:
			return state.setIn(["isLoading", "userCalendar"], action.isLoading);
		case types.SET_IS_LOADING_USER_SETTINGS:
			return state.setIn(["isLoading", "userSettings"], action.isLoading);
		case types.SET_IS_LOADING_USER_UNWATCHED:
			return state.setIn(["isLoading", "userUnwatched"], action.isLoading);
		default:
			return state;
	}
}

//Селекторы пользовательской информации
export function getLoggedIn(state) {
	return state.get("auth").loggedIn;
}
export function getAuth(state) {
	return state.get("auth");
}
export function getUser(state) {
	return state.get("user");
}
export function getUserCalendar(state) {
	return state.get("userCalendar");
}
export function getUserSettings(state) {
	return state.get("userSettings");
}
export function getUserUnwatched(state) {
	return state.get("userUnwatched");
}

//Селекторы информации о контенте
export function getContentGame(state) {
	return state.get("content").game.main_info;
}
export function getContentGameUserInfo(state) {
	return state.get("content").game.user_info;
}
export function getContentMovie(state) {
	return state.get("content").movie.main_info;
}
export function getContentMovieUserInfo(state) {
	return state.get("content").movie.user_info;
}
export function getContentShow(state) {
	return state.get("content").show.main_info;
}
export function getContentShowUserInfo(state) {
	return state.get("content").show.user_info;
}
export function getContentShowSeasons(state, seasonNumber) {
	return state.get("content").showSeasons[seasonNumber]?.main_info;
}
export function getContentShowSeasonsUserInfo(state, seasonNumber) {
	return state.get("content").showSeasons[seasonNumber]?.user_info;
}

//Селекторы поисковых результатов
export function getSearchContentGames(state) {
	return state.get("searchContent").games;
}
export function getSearchContentMovies(state) {
	return state.get("searchContent").movies;
}
export function getSearchContentShows(state) {
	return state.get("searchContent").shows;
}
export function getSearchContentUsers(state) {
	return state.get("searchContent").users;
}

//Селекторы страницы профиля
export function getUserPageContent(state) {
	return state.get("userPageContent").user;
}
export function getUserPageLogs(state) {
	return state.get("userPageContent").userLogs;
}
export function getUserPageFriendsLogs(state) {
	return state.get("userPageContent").userFriendsLogs;
}

//Селекторы ошибок
export function getAuthError(state) {
	return state.get("errors").auth;
}
export function getRegistrateError(state) {
	return state.get("errors").registrate;
}
export function getGameRequestError(state) {
	return state.get("errors").gameRequest;
}
export function getMovieRequestError(state) {
	return state.get("errors").movieRequest;
}
export function getShowRequestError(state) {
	return state.get("errors").showRequest;
}
export function getUserPageError(state) {
	return state.get("errors").userPage;
}
export function getResetPasswordError(state) {
	return state.get("errors").resetPassword;
}
export function getConfirmPasswordError(state) {
	return state.get("errors").confirmPassword;
}

//Селекторы состояния высплывающих окон
export function getLoginForm(state) {
	return state.get("openedPages").LoginForm;
}
export function getRegistrateForm(state) {
	return state.get("openedPages").RegistrateForm;
}
export function getResetPasswordForm(state) {
	return state.get("openedPages").ResetPasswordForm;
}

//Селекторы состояния загрузки
export function getIsLoadingContentGame(state) {
	return state.get("isLoading").contentGame;
}
export function getIsLoadingContentGameUserInfo(state) {
	return state.get("isLoading").contentGameUserInfo;
}
export function getIsLoadingContentMovie(state) {
	return state.get("isLoading").contentMovie;
}
export function getIsLoadingContentMovieUserInfo(state) {
	return state.get("isLoading").contentMovieUserInfo;
}
export function getIsLoadingContentShow(state) {
	return state.get("isLoading").contentShow;
}
export function getIsLoadingContentShowUserInfo(state) {
	return state.get("isLoading").contentShowUserInfo;
}
export function getIsLoadingContentShowSeasons(state, seasonNumber) {
	return state.get("isLoading").contentShowSeasons[seasonNumber];
}
export function getIsLoadingSearchGames(state) {
	return state.get("isLoading").searchGames;
}
export function getIsLoadingSearchMovies(state) {
	return state.get("isLoading").searchMovies;
}
export function getIsLoadingSearchShows(state) {
	return state.get("isLoading").searchShows;
}
export function getIsLoadingSearchUsers(state) {
	return state.get("isLoading").searchUsers;
}
export function getIsLoadingSearchAll(state) {
	return state.get("isLoading").searchUsers || state.get("isLoading").searchMovies || state.get("isLoading").searchGames;
}
export function getIsLoadingUserPageContent(state) {
	return state.get("isLoading").userPageContent;
}
export function getIsLoadingUserPageLogs(state) {
	return state.get("isLoading").userPageLogs;
}
export function getIsLoadingUserPageFriendsLogs(state) {
	return state.get("isLoading").userPageFriendsLogs;
}
export function getIsLoadingUserCalendar(state) {
	return state.get("isLoading").userCalendar;
}
export function getIsLoadingUserSettings(state) {
	return state.get("isLoading").userSettings;
}
export function getIsLoadingUserUnwatched(state) {
	return state.get("isLoading").userUnwatched;
}
