import * as actionTypes from "./actionTypes";
import * as selectors from "./reducers";
import * as auth from "../services/jwtAuth";
import { TOKEN_LIFETIME } from "../settings";
import * as userRequests from "../services/userRequests";
import * as gameRequests from "../services/gameRequests";
import * as movieRequests from "../services/movieRequests";
import * as showRequests from "../services/showRequests";
import { toast } from "react-toastify";
import jwt_decode from "jwt-decode";

export function tryAuth(login, password) {
	return async (dispatch) => {
		setError(dispatch, actionTypes.AUTH_ERROR, false);

		try {
			const res = await auth.getToken(login, password);
			if (res !== null) {
				localStorage.setItem("refreshToken", res.refreshToken);
				localStorage.setItem("token", res.token);
				localStorage.setItem("tokenTime", Date.now());
				dispatch({
					type: actionTypes.SET_AUTH,
					auth: { loggedIn: true },
				});
				dispatch({
					type: actionTypes.SET_USER,
					user: res.user,
				});
				dispatch({
					type: actionTypes.SET_LOGINFORM,
					isOpen: false,
				});
			} else {
				setError(dispatch, actionTypes.AUTH_ERROR, true);
			}
		} catch (error) {
			console.error(error);
			setError(dispatch, actionTypes.AUTH_ERROR, true);
		}
	};
}

export function checkAuthorization() {
	return async (dispatch) => {
		if ((localStorage.getItem("token") === null) | (Date.now() - localStorage.getItem("tokenTime") > TOKEN_LIFETIME)) {
			const res = await auth.updateToken(localStorage.getItem("refreshToken"));
			if (res !== null) {
				dispatch({
					type: actionTypes.SET_AUTH,
					auth: { loggedIn: true },
				});
				dispatch({
					type: actionTypes.SET_USER,
					user: res.user,
				});
				localStorage.setItem("token", res.token);
				localStorage.setItem("tokenTime", Date.now());
				return true;
			} else {
				//toast.warn("Произошла ошибка авторизации. Зайдите ещё раз");
				dispatch(resetAuthorization());
				return false;
			}
		} else {
			let userData = jwt_decode(localStorage.getItem("token"));
			let user = { username: userData.username, id: userData.user_id, email: userData.email };
			dispatch({
				type: actionTypes.SET_USER,
				user: user,
			});
			dispatch({
				type: actionTypes.SET_AUTH,
				auth: { loggedIn: true },
			});
			return true;
		}
	};
}

export function resetAuthorization() {
	return async (dispatch) => {
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("token");
		localStorage.removeItem("tokenTime");
		dispatch({
			type: actionTypes.SET_AUTH,
			auth: { loggedIn: false },
		});
		dispatch({
			type: actionTypes.SET_USER,
			user: { username: "", id: null, email: "" },
		});
	};
}

export function registrationRequest(username, email, password) {
	return async (dispatch) => {
		setError(dispatch, actionTypes.REGISTRATE_ERROR, false);
		auth.registration(username, email, password).then((result) => {
			if ((result.status === 201) | (result.status === 200)) {
				dispatch({
					type: actionTypes.SET_USER,
					user: { login: result.username, email: result.email },
				});
			} else {
				for (let error in result.data) toast.error(result.data[error][0]);

				setError(dispatch, actionTypes.REGISTRATE_ERROR, true);
			}
		});
	};
}

export function confirmEmailRequest(uid64, token) {
	return async () => {
		auth.confirmation(uid64, token).then((result) => {
			if (result.status === 200) {
				toast.success("Почта подтверждена!");
			} else {
				if (result.data) toast.error(result.data.error);
			}
		});
	};
}

export function requestGame(id) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME, true);
		setError(dispatch, actionTypes.GAME_REQUEST_ERROR, false);
		gameRequests.getGame(localStorage.getItem("token"), id).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_CONTENT_GAME,
					game: result,
				});
			} else {
				toast.error("Игра не найдена!");
				setError(dispatch, actionTypes.GAME_REQUEST_ERROR, true);
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME, false);
		});
	};
}

export function requestGameUserInfo(slug) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME_USER_INFO, true);
		gameRequests.getGameUserInfo(localStorage.getItem("token"), slug).then((result) => {
			if (result != null) {
				let newResult = { ...result.user_info, friends_info: result.friends_info };
				dispatch({
					type: actionTypes.SET_CONTENT_GAME_USER_INFO,
					user_info: newResult,
				});
			} else {
				toast.error("Ошибка загрузки логов!");
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME_USER_INFO, false);
		});
	};
}

export function requestMovie(id) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE, true);
		setError(dispatch, actionTypes.MOVIE_REQUEST_ERROR, false);
		movieRequests.getMovie(localStorage.getItem("token"), id).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_CONTENT_MOVIE,
					movie: result,
				});
			} else {
				toast.error("Фильм не найден!");
				setError(dispatch, actionTypes.MOVIE_REQUEST_ERROR, true);
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE, false);
		});
	};
}

export function requestMovieUserInfo(id) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE_USER_INFO, true);
		movieRequests.getMovieUserInfo(localStorage.getItem("token"), id).then((result) => {
			if (result != null) {
				let newResult = { ...result.user_info, friends_info: result.friends_info };
				dispatch({
					type: actionTypes.SET_CONTENT_MOVIE_USER_INFO,
					user_info: newResult,
				});
			} else {
				toast.error("Ошибка загрузки логов!");
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE_USER_INFO, false);
		});
	};
}

export function requestShow(id) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW, true);
		setError(dispatch, actionTypes.SHOW_REQUEST_ERROR, false);
		showRequests.getShow(localStorage.getItem("token"), id).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_CONTENT_SHOW,
					show: result,
				});
			} else {
				toast.error("Сериал не найден!");
				setError(dispatch, actionTypes.SHOW_REQUEST_ERROR, true);
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW, false);
		});
	};
}

export function requestShowSeason(showID, seasonNumber) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW, true);
		setError(dispatch, actionTypes.SHOW_REQUEST_ERROR, false);
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_CONTENT_SHOW,
					show: result,
				});
			} else {
				toast.error("Сериал не найден!");
				setError(dispatch, actionTypes.SHOW_REQUEST_ERROR, true);
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW, false);
		});
	};
}

export function requestShowSeasons(showID, seasonNumber) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		dispatch({
			type: actionTypes.SET_IS_LOADING_CONTENT_SHOW_SEASONS,
			seasonNumber: seasonNumber,
			isLoading: true,
		});
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_CONTENT_SHOW_SEASONS,
					seasonNumber: seasonNumber,
					info: result,
				});
			} else {
				toast.error("Сериал не найден!");
			}
			dispatch({
				type: actionTypes.SET_IS_LOADING_CONTENT_SHOW_SEASONS,
				seasonNumber: seasonNumber,
				isLoading: false,
			});
		});
	};
}

export function requestShowEpisode(showID, seasonNumber, episodeNumber) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW, true);
		setError(dispatch, actionTypes.SHOW_REQUEST_ERROR, false);
		showRequests.getShowEpisode(localStorage.getItem("token"), showID, seasonNumber, episodeNumber).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_CONTENT_SHOW,
					show: result,
				});
			} else {
				toast.error("Серия не найдена!");
				setError(dispatch, actionTypes.SHOW_REQUEST_ERROR, true);
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW, false);
		});
	};
}

export function requestShowUserInfo(id) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW_USER_INFO, true);
			showRequests.getShowUserInfo(localStorage.getItem("token"), id).then((result) => {
				if (result != null) {
					let newResult = { ...result.user_info, friends_info: result.friends_info };
					dispatch({
						type: actionTypes.SET_CONTENT_SHOW_USER_INFO,
						user_info: newResult,
					});
				} else {
					toast.error("Ошибка загрузки логов!");
				}
				setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW_USER_INFO, false);
			});
		}
	};
}

export function requestShowSeasonUserInfo(showID, seasonID) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW_USER_INFO, true);
			showRequests.getShowSeasonUserInfo(localStorage.getItem("token"), showID, seasonID).then((result) => {
				if (result != null) {
					let newResult = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info, friends_info: result.friends_info };
					dispatch({
						type: actionTypes.SET_CONTENT_SHOW_USER_INFO,
						user_info: newResult,
					});
				} else {
					toast.error("Ошибка загрузки логов!");
				}
				setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW_USER_INFO, false);
			});
		}
	};
}

export function requestShowSeasonsUserInfo(showID, seasonID) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			dispatch({
				type: actionTypes.SET_IS_LOADING_CONTENT_SHOW_SEASONS,
				seasonNumber: seasonID,
				isLoading: true,
			});
			showRequests.getShowSeasonUserInfo(localStorage.getItem("token"), showID, seasonID).then((result) => {
				if (result != null) {
					let newResult = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info, friends_info: result.friends_info };
					dispatch({
						type: actionTypes.SET_CONTENT_SHOW_SEASONS_USER_INFO,
						seasonNumber: seasonID,
						user_info: newResult,
					});
				} else {
					toast.error("Ошибка загрузки сезона!");
				}
				dispatch({
					type: actionTypes.SET_IS_LOADING_CONTENT_SHOW_SEASONS,
					seasonNumber: seasonID,
					isLoading: false,
				});
			});
		}
	};
}

export function requestShowEpisodeUserInfo(showID, seasonID, episodeID) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW_USER_INFO, true);
			showRequests.getShowEpisodeUserInfo(localStorage.getItem("token"), showID, seasonID, episodeID).then((result) => {
				if (result != null) {
					let newResult = { ...result.user_info, user_watched_show: result.user_watched_show, friends_info: result.friends_info };
					dispatch({
						type: actionTypes.SET_CONTENT_SHOW_USER_INFO,
						user_info: newResult,
					});
				} else {
					toast.error("Ошибка загрузки логов!");
				}
				setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_SHOW_USER_INFO, false);
			});
		}
	};
}

export function setGameStatus(user_info) {
	return async (dispatch, getState) => {
		if (await dispatch(checkAuthorization())) {
			gameRequests.setGameStatus(localStorage.getItem("token"), selectors.getContentGame(getState()).rawg.slug, user_info).then((result) => {
				if (!result) {
					toast.error("Ошибка обновления статуса");
				} else {
					/*dispatch({
                        type: actionTypes.SET_CONTENT_GAME_USERINFO,
                        user_info: result
                    });*/
				}
			});
		}
	};
}

export function requestUserPageContent(username) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT, true);
		setError(dispatch, actionTypes.USER_PAGE_ERROR, false);
		userRequests.getUserInfo(localStorage.getItem("token"), username).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_USER_PAGE_CONTENT,
					content: result,
				});
			} else {
				toast.error("Профиль не найден!");
				setError(dispatch, actionTypes.USER_PAGE_ERROR, true);
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT, false);
		});
	};
}

export function requestUserPageLogs(userID, page, resultsOnPage) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_LOGS, true);
		userRequests.getUserLog(localStorage.getItem("token"), userID, page, resultsOnPage).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_USER_PAGE_LOGs,
					logs: result,
				});
			} else {
				toast.error("Ошибка загрузки логов!");
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_LOGS, false);
		});
	};
}

export function requestUserPageFriendsLogs(userID, page, resultsOnPage) {
	return async (dispatch) => {
		await dispatch(checkAuthorization());
		setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS, true);
		userRequests.getUserFriendsLog(localStorage.getItem("token"), userID, page, resultsOnPage).then((result) => {
			if (result != null) {
				dispatch({
					type: actionTypes.SET_USER_PAGE_FRIENDS_LOGS,
					logs: result,
				});
			} else {
				toast.error("Ошибка загрузки активности друзей!");
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS, false);
		});
	};
}

export function requestUserCalendar() {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_CALENDAR, true);
			userRequests.getUserCalendar(localStorage.getItem("token")).then((result) => {
				if (result != null) {
					dispatch({
						type: actionTypes.SET_USER_CALENDAR,
						data: result,
					});
				} else {
					toast.error("Ошибка загрузки календаря!");
				}
				setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_CALENDAR, false);
			});
		}
	};
}

export function requestUserSettings() {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_SETTINGS, true);
			userRequests.getUserSettings(localStorage.getItem("token")).then((result) => {
				if (result != null) {
					dispatch({
						type: actionTypes.SET_USER_SETTINGS,
						data: result,
					});
				} else {
					toast.error("Ошибка загрузки настроек!");
				}
				setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_SETTINGS, false);
			});
		}
	};
}

export function searchGames(query, page, gamesCount) {
	return async (dispatch) => {
		setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_GAMES, true);
		gameRequests.searchGames(query, page, gamesCount).then((result) => {
			if (!result) {
				toast.error("Ошибка поиска");
			} else {
				dispatch({
					type: actionTypes.SET_SEARCH_CONTENT_GAMES,
					games: result,
				});
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_GAMES, false);
		});
	};
}

export function searchMovies(query, page) {
	return async (dispatch) => {
		setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_MOVIES, true);
		movieRequests.searchMovies(query, page).then((result) => {
			if (!result) {
				toast.error("Ошибка поиска фильмов");
			} else {
				dispatch({
					type: actionTypes.SET_SEARCH_CONTENT_MOVIES,
					movies: result.results,
				});
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_MOVIES, false);
		});
	};
}

export function searchShows(query, page) {
	return async (dispatch) => {
		setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_SHOWS, true);
		showRequests.searchShows(query, page).then((result) => {
			if (!result) {
				toast.error("Ошибка поиска сериалов");
			} else {
				dispatch({
					type: actionTypes.SET_SEARCH_CONTENT_SHOWS,
					shows: result.results,
				});
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_SHOWS, false);
		});
	};
}

export function setMovieStatus(user_info) {
	return async (dispatch, getState) => {
		if (await dispatch(checkAuthorization())) {
			movieRequests.setMovieStatus(localStorage.getItem("token"), selectors.getContentMovie(getState()).tmdb.id, user_info).then((result) => {
				if (!result) {
					toast.error("Ошибка обновления статуса");
				} else {
					/*dispatch({
                        type: actionTypes.SET_CONTENT_MOVIE_USERINFO,
                        user_info: result
                    });*/
				}
			});
		}
	};
}

export function setShowStatus(user_info) {
	return async (dispatch, getState) => {
		if (await dispatch(checkAuthorization())) {
			showRequests.setShowStatus(localStorage.getItem("token"), selectors.getContentShow(getState()).tmdb.id, user_info).then((result) => {
				if (!result) {
					toast.error("Ошибка обновления статуса");
				} else {
					/*dispatch({
                        type: actionTypes.SET_CONTENT_SHOW_USERINFO,
                        user_info: result
                    });*/
				}
			});
		}
	};
}

export function setShowSeasonStatus(user_info, showID, seasonNumber) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			showRequests.setShowSeasonStatus(localStorage.getItem("token"), showID, seasonNumber, user_info).then((result) => {
				if (!result) {
					toast.error("Ошибка обновления статуса");
				} else {
					/*dispatch({
                        type: actionTypes.SET_CONTENT_SHOW_USERINFO,
                        user_info: result
                    });*/
				}
			});
		}
	};
}

export function setShowEpisodesStatus(episodesList, showID, needUpdate = false) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			showRequests.setShowEpisodesStatus(localStorage.getItem("token"), showID, episodesList).then((result) => {
				if ((result.status !== 204) & (result.status !== 200) & (result.status !== 201)) {
					toast.error("Ошибка обновления статуса");
				} else {
					if (needUpdate) {
						let seasons = [];
						for (let episode in episodesList.episodes) if (seasons.indexOf(episodesList.episodes[episode].season_number) === -1) seasons.push(episodesList.episodes[episode].season_number);

						for (let season in seasons) dispatch(requestShowSeasonsUserInfo(showID, seasons[season]));
					}
				}
			});
		}
	};
}

export function searchUsers(query) {
	return async (dispatch) => {
		setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_USERS, true);
		userRequests.searchUsers(query).then((result) => {
			if (!result) {
				toast.error("Ошибка поиска");
			} else {
				dispatch({
					type: actionTypes.SET_SEARCH_CONTENT_USERS,
					users: result,
				});
			}
			setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_USERS, false);
		});
	};
}

export function setUserStatus(is_following, userID) {
	return async (dispatch) => {
		if (await dispatch(checkAuthorization())) {
			userRequests.setUserStatus(localStorage.getItem("token"), is_following, userID).then((result) => {
				if (!result) {
					toast.error("Ошибка обновления статуса");
				} else {
					dispatch({
						type: actionTypes.SET_USER_PAGE_FOLLOWING,
						is_following: result.is_following,
					});
				}
			});
		}
	};
}

export function resetPassword(email) {
	return async (dispatch) => {
		dispatch({
			type: actionTypes.RESET_PASSWORD_ERROR,
			error: false,
		});
		auth.resetPassword(email).then((result) => {
			if (result.status !== 200) {
				dispatch({
					type: actionTypes.RESET_PASSWORD_ERROR,
					error: result.data.error,
				});
			} else {
				dispatch({
					type: actionTypes.RESET_PASSWORD_ERROR,
					error: "ok",
				});
			}
		});
	};
}

export function confirmPassword(token, password) {
	return async (dispatch) => {
		dispatch({
			type: actionTypes.CONFIRM_PASSWORD_ERROR,
			error: false,
		});
		auth.confirmPassword(token, password).then((result) => {
			if (result.status !== 200) {
				dispatch({
					type: actionTypes.CONFIRM_PASSWORD_ERROR,
					error: result.data.error ? result.data.error : "Неизвестная ошибка",
				});
			} else {
				dispatch({
					type: actionTypes.CONFIRM_PASSWORD_ERROR,
					error: "ok",
				});
			}
		});
	};
}

export function patchUserSettings(settings) {
	return async (dispatch, getState) => {
		if (await dispatch(checkAuthorization())) {
			setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_SETTINGS, true);
			userRequests.patchUserSettings(localStorage.getItem("token"), settings).then((result) => {
				if (!result) {
					toast.error("Ошибка сохренения настроек");
				} else {
					toast.success("Настройки сохранены!");
					/*dispatch({
                        type: actionTypes.SET_CONTENT_MOVIE_USERINFO,
                        user_info: result
                    });*/
				}
				setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_SETTINGS, false);
			});
		}
	};
}

export function setUser(user) {
	return { type: actionTypes.SET_USER, user: user };
}

export function openLoginForm() {
	return { type: actionTypes.SET_LOGINFORM, isOpen: true };
}

export function closeLoginForm() {
	return { type: actionTypes.SET_LOGINFORM, isOpen: false };
}

export function openRegistrateForm() {
	return { type: actionTypes.SET_REGISTRATEFORM, isOpen: true };
}

export function closeRegistrateForm() {
	return { type: actionTypes.SET_REGISTRATEFORM, isOpen: false };
}

export function openResetPasswordForm() {
	return { type: actionTypes.SET_RESET_PASSWORD_FORM, isOpen: true };
}

export function closeResetPasswordForm() {
	return { type: actionTypes.SET_RESET_PASSWORD_FORM, isOpen: false };
}

function setLoading(dispatch, type, isLoading) {
	dispatch({
		type: type,
		isLoading: isLoading,
	});
}

function setError(dispatch, type, isError) {
	dispatch({
		type: type,
		error: isError,
	});
}
