import * as actionTypes from './actionTypes';
import * as selectors from './reducers';
import {getToken, updateToken, registration, confirmation} from "../services/jwtAuth";
import {TOKEN_LIFETIME} from "../settings";
import * as Requests from "../services/requests";
import { toast } from "react-toastify";
import jwt_decode from 'jwt-decode';

export function tryAuth(login, password) {
    return async(dispatch) => {
        dispatch({
            type: actionTypes.AUTH_ERROR,
            error: false 
        });

      try {
        const res = await getToken(login, password);
        if (res !== null){
            localStorage.setItem('refreshToken', res.refreshToken);
            localStorage.setItem('token', res.token);
            localStorage.setItem('tokenTime', Date.now());
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
                isOpen: false 
            });
        }else{
            dispatch({
                type: actionTypes.AUTH_ERROR,
                error: true 
            });
        }
            
      }catch (error) {
        console.error(error);
        dispatch({
            type: actionTypes.AUTH_ERROR,
            error: true 
        });
      }
    };
}

export function checkAuthorization(){
    return async(dispatch) => {
        if (localStorage.getItem('token') === null | Date.now() - localStorage.getItem('tokenTime') > TOKEN_LIFETIME){
            const res = await updateToken(localStorage.getItem("refreshToken"));
            if (res !== null){
                dispatch({
                    type: actionTypes.SET_AUTH,
                    auth: { loggedIn: true }, 
                });
                dispatch({
                    type: actionTypes.SET_USER,
                    user: res.user, 
                });
                localStorage.setItem('token', res.token);
                localStorage.setItem('tokenTime', Date.now());
                return true;
            }else{
                //toast.warn("Произошла ошибка авторизации. Зайдите ещё раз");
                dispatch(resetAuthorization());
                return false;
            } 
        }else{
            let userData = jwt_decode(localStorage.getItem('token'));
            let user = {username: userData.username, id: userData.user_id, email: userData.email};
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
            
    }
}

export function resetAuthorization(){
    return async(dispatch) => {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('token');
        localStorage.removeItem('tokenTime');
        dispatch({
            type: actionTypes.SET_AUTH,
            auth: { loggedIn: false }, 
        });
        dispatch({
            type: actionTypes.SET_USER,
            user: { username:"", id: null, email:"" }, 
        });
    }
}

export function registrationRequest(username, email, password){
    return async(dispatch) => {
        registration(username, email, password).then((result) => {
            console.log(result);
            if (result.status !== 400){
                dispatch({
                    type: actionTypes.SET_USER,
                    user: { login: result.username, email: result.email }, 
                });
                dispatch({
                    type: actionTypes.REGISTRATE_ERROR,
                    error: false 
                });
            }
            else{
                for (let error in result.data)
                    toast.error(result.data[error][0]);
                   
                dispatch({
                    type: actionTypes.REGISTRATE_ERROR,
                    error: true 
                });
            }
        });
    }
}

export function confirmEmailRequest(uid64, token){
    return async() => {
        confirmation(uid64, token).then((result) => {
            console.log(result);
            if (result.status !== 400){
                toast.success("Почта подтверждена!");
            }
            else{
                toast.error(result.data);
            }
        });
    }
}

export function requestGame(id){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_CONTENT_GAME,
            isLoading: true
        });
        Requests.getGame(localStorage.getItem('token'), id).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_GAME,
                    game: result, 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_CONTENT_GAME,
                    isLoading: false
                });
            }
            else{
                toast.error("Игра не найдена!");
                dispatch({
                    type: actionTypes.GAME_REQUEST_ERROR,
                    error: true 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_CONTENT_GAME,
                    isLoading: false
                });
            }
        });
    }
}

export function requestMovie(id){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_CONTENT_MOVIE,
            isLoading: true
        });
        Requests.getMovie(localStorage.getItem('token'), id).then((result) => {
            console.log(result);
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_MOVIE,
                    movie: result, 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_CONTENT_MOVIE,
                    isLoading: false
                });
            }
            else{
                toast.error("Фильм не найден!");
                dispatch({
                    type: actionTypes.MOVIE_REQUEST_ERROR,
                    error: true 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_CONTENT_MOVIE,
                    isLoading: false
                });
            }
        });
    }
}

export function setGameStatus(user_info){
    return async(dispatch, getState) => {
        if (await dispatch(checkAuthorization())){
            Requests.setGameStatus(localStorage.getItem('token'), selectors.getContentGame(getState()).rawg.slug, user_info).then((result) => {
                if (!result){
                    toast.error("Ошибка обновления статуса")
                }
                else{
                    dispatch({
                        type: actionTypes.SET_CONTENT_GAME_USERINFO,
                        user_info: result
                    });
                }
            });
        }
    }
}

/*export function patchGameStatus(user_info){
    return async(dispatch, getState) => {
        if (await dispatch(checkAuthorization())){
            Requests.patchGameStatus(localStorage.getItem('token'), selectors.getContentGame(getState()).rawg.slug, user_info).then((result) => {
                console.log(result)
                if (!result){
                    toast.error("Ошибка обновления статуса")
                }
                else{
                    dispatch({
                        type: actionTypes.SET_CONTENT_GAME_USERINFO,
                        user_info: result
                    });
                }
            });
        }
    }
}*/

export function requestUserPageContent(username){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT,
            isLoading: true
        });
        Requests.getUserInfo(localStorage.getItem('token'), username).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_USER_PAGE_CONTENT,
                    content: result, 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT,
                    isLoading: false
                });
            }
            else{
                toast.error("Профиль не найден!");
                dispatch({
                    type: actionTypes.USER_PAGE_ERROR,
                    error: true 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT,
                    isLoading: false
                });
            }
        });
    }
}

export function requestUserPageLogs(userID, page, resultsOnPage){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_USER_PAGE_LOGS,
            isLoading: true
        });
        Requests.getUserLog(localStorage.getItem('token'), userID, page, resultsOnPage).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_USER_PAGE_LOGs,
                    logs: result, 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_USER_PAGE_LOGS,
                    isLoading: false
                });
            }
            else{
                toast.error("Ошибка загрузки логов!");
                dispatch({
                    type: actionTypes.SET_IS_LOADING_USER_PAGE_LOGS,
                    isLoading: false
                });
            }
        });
    }
}

export function requestUserPageFriendsLogs(userID, page, resultsOnPage){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS,
            isLoading: true
        });
        Requests.getUserFriendsLog(localStorage.getItem('token'), userID, page, resultsOnPage).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_USER_PAGE_FRIENDS_LOGS,
                    logs: result, 
                });
                dispatch({
                    type: actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS,
                    isLoading: false
                });
            }
            else{
                toast.error("Ошибка загрузки логов!");
                dispatch({
                    type: actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS,
                    isLoading: false
                });
            }
        });
    }
}

export function searchGames(query, page){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_SEARCH_GAMES,
            isLoading: true
        });
        Requests.searchGames(query, page).then((result) => {
            if (!result){
                toast.error("Ошибка поиска")
            }
            else{
                dispatch({
                    type: actionTypes.SET_SEARCH_CONTENT_GAMES,
                    games: result, 
                });
            }
            dispatch({
                type: actionTypes.SET_IS_LOADING_SEARCH_GAMES,
                isLoading: false
            });
        });
    }
}

export function searchMovies(query, page){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_SEARCH_MOVIES,
            isLoading: true
        });
        Requests.searchMovies(query, page).then((result) => {
            if (!result){
                toast.error("Ошибка поиска")
            }
            else{
                dispatch({
                    type: actionTypes.SET_SEARCH_CONTENT_MOVIES,
                    movies: result.results, 
                });
            }
            dispatch({
                type: actionTypes.SET_IS_LOADING_SEARCH_MOVIES,
                isLoading: false
            });
        });
    }
}

export function setMovieStatus(user_info){
    return async(dispatch, getState) => {
        if (await dispatch(checkAuthorization())){
            Requests.setMovieStatus(localStorage.getItem('token'), selectors.getContentMovie(getState()).tmdb.id, user_info).then((result) => {
                if (!result){
                    toast.error("Ошибка обновления статуса")
                }
                else{
                    dispatch({
                        type: actionTypes.SET_CONTENT_MOVIE_USERINFO,
                        user_info: result
                    });
                }
            });
        }
    }
}

export function searchUsers(query){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.SET_IS_LOADING_SEARCH_USERS,
            isLoading: true
        });
        Requests.searchUsers(query).then((result) => {
            if (!result){
                toast.error("Ошибка поиска")
            }
            else{
                dispatch({
                    type: actionTypes.SET_SEARCH_CONTENT_USERS,
                    users: result, 
                });
            }
            dispatch({
                type: actionTypes.SET_IS_LOADING_SEARCH_USERS,
                isLoading: false
            });
        });
    }
}

export function setUserStatus(is_following, userID){
    return async(dispatch) => {
        if (await dispatch(checkAuthorization())){
            Requests.setUserStatus(localStorage.getItem('token'), is_following, userID).then((result) => {
                if (!result){
                    toast.error("Ошибка обновления статуса")
                }
                else{
                    dispatch({
                        type: actionTypes.SET_USER_PAGE_FOLLOWING,
                        is_following: result.is_following
                    });
                }
            });
        }
    }
}

export function setUser(user) {
    return({ type: actionTypes.SET_USER, user: user });
}

export function openLoginForm() {
    return({ type: actionTypes.SET_LOGINFORM, isOpen: true  });
}

export function closeLoginForm() {
    return({ type: actionTypes.SET_LOGINFORM, isOpen: false  });
}

export function openRegistrateForm() {
    return({ type: actionTypes.SET_REGISTRATEFORM, isOpen: true  });
}

export function closeRegistrateForm() {
    return({ type: actionTypes.SET_REGISTRATEFORM, isOpen: false  });
}