import * as actionTypes from './actionTypes';
import * as selectors from './reducers';
import * as auth from "../services/jwtAuth";
import {TOKEN_LIFETIME} from "../settings";
import * as Requests from "../services/requests";
import { toast } from "react-toastify";
import jwt_decode from 'jwt-decode';

export function tryAuth(login, password) {
    return async(dispatch) => {
        
        setError(dispatch, actionTypes.AUTH_ERROR, false);

      try {
        const res = await auth.getToken(login, password);
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
            setError(dispatch, actionTypes.AUTH_ERROR, true);
        }
            
      }catch (error) {
        console.error(error);
        setError(dispatch, actionTypes.AUTH_ERROR, true);
      }
    };
}

export function checkAuthorization(){
    return async(dispatch) => {
        if (localStorage.getItem('token') === null | Date.now() - localStorage.getItem('tokenTime') > TOKEN_LIFETIME){
            const res = await auth.updateToken(localStorage.getItem("refreshToken"));
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
        setError(dispatch, actionTypes.REGISTRATE_ERROR, false);
        auth.registration(username, email, password).then((result) => {
            console.log(result);
            if (result.status !== 400){
                dispatch({
                    type: actionTypes.SET_USER,
                    user: { login: result.username, email: result.email }, 
                });
            }
            else{
                for (let error in result.data)
                    toast.error(result.data[error][0]);
                
                setError(dispatch, actionTypes.REGISTRATE_ERROR, true);
            }
        });
    }
}

export function confirmEmailRequest(uid64, token){
    return async() => {
        auth.confirmation(uid64, token).then((result) => {
            console.log(result);
            if (result.status === 200){
                toast.success("Почта подтверждена!");
            }
            else{
                if (result.data)
                    toast.error(result.data.error);
            }
        });
    }
}

export function requestGame(id){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME, true);
        setError(dispatch, actionTypes.GAME_REQUEST_ERROR, false);
        Requests.getGame(localStorage.getItem('token'), id).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_GAME,
                    game: result, 
                });
            }
            else{
                toast.error("Игра не найдена!");
                setError(dispatch, actionTypes.GAME_REQUEST_ERROR, true);
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME, false);
        });
    }
}


export function requestGameFriends(slug, page){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME_FRIENDS, true);
        Requests.getGameFriends(localStorage.getItem('token'), slug, page).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_GAME_FRIENDS,
                    info: result, 
                });
            }
            else{
                toast.error("Ошибка загрузки логов!");
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_GAME_FRIENDS, false);
        });
    }
}

export function requestMovie(id){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE, true);
        setError(dispatch, actionTypes.MOVIE_REQUEST_ERROR, false);
        Requests.getMovie(localStorage.getItem('token'), id).then((result) => {
            console.log(result);
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_MOVIE,
                    movie: result, 
                });
            }
            else{
                toast.error("Фильм не найден!");
                setError(dispatch, actionTypes.MOVIE_REQUEST_ERROR, true);
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE, false);
        });
    }
}

export function requestMovieFriends(id, page){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE_FRIENDS, true);
        Requests.getMovieFriends(localStorage.getItem('token'), id, page).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_MOVIE_FRIENDS,
                    info: result, 
                });
            }
            else{
                toast.error("Ошибка загрузки логов!");
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_CONTENT_MOVIE_FRIENDS, false);
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

export function requestUserPageContent(username){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT, true);
        setError(dispatch, actionTypes.USER_PAGE_ERROR, false);
        Requests.getUserInfo(localStorage.getItem('token'), username).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_USER_PAGE_CONTENT,
                    content: result, 
                });
            }
            else{
                toast.error("Профиль не найден!");
                setError(dispatch, actionTypes.USER_PAGE_ERROR, true);
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_CONTENT, false);
        });
    }
}

export function requestUserPageLogs(userID, page, resultsOnPage){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_LOGS, true);
        Requests.getUserLog(localStorage.getItem('token'), userID, page, resultsOnPage).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_USER_PAGE_LOGs,
                    logs: result, 
                });
            }
            else{
                toast.error("Ошибка загрузки логов!");
                
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_LOGS, false);
        });
    }
}

export function requestUserPageFriendsLogs(userID, page, resultsOnPage){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS, true);
        Requests.getUserFriendsLog(localStorage.getItem('token'), userID, page, resultsOnPage).then((result) => {
            if (result != null){
                dispatch({
                    type: actionTypes.SET_USER_PAGE_FRIENDS_LOGS,
                    logs: result, 
                });
            }
            else{
                toast.error("Ошибка загрузки логов!");
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_USER_PAGE_FRIENDS_LOGS, false);
        });
    }
}

export function searchGames(query, page, gamesCount){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_GAMES, true);
        Requests.searchGames(query, page, gamesCount).then((result) => {
            if (!result){
                toast.error("Ошибка поиска")
            }
            else{
                dispatch({
                    type: actionTypes.SET_SEARCH_CONTENT_GAMES,
                    games: result, 
                });
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_GAMES, false);
        });
    }
}

export function searchMovies(query, page){
    return async(dispatch) => {
        setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_MOVIES, true);
        Requests.searchMovies(query, page).then((result) => {
            if (!result){
                toast.error("Ошибка поиска фильмов")
            }
            else{
                dispatch({
                    type: actionTypes.SET_SEARCH_CONTENT_MOVIES,
                    movies: result.results, 
                });
            }
            setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_MOVIES, false);
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
        setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_USERS, true);
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
            setLoading(dispatch, actionTypes.SET_IS_LOADING_SEARCH_USERS, false);
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

export function resetPassword(email){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.RESET_PASSWORD_ERROR,
            error: false
        });
        auth.resetPassword(email).then((result) => {
            if (result.status !== 200){
                dispatch({
                    type: actionTypes.RESET_PASSWORD_ERROR,
                    error: result.data.error
                });
            }
            else{
                dispatch({
                    type: actionTypes.RESET_PASSWORD_ERROR,
                    error: 'ok'
                });
            }
        });
    }
}

export function confirmPassword(token, password){
    return async(dispatch) => {
        dispatch({
            type: actionTypes.CONFIRM_PASSWORD_ERROR,
            error: false
        });
        auth.confirmPassword(token, password).then((result) => {
            if (result.status !== 200){
                dispatch({
                    type: actionTypes.CONFIRM_PASSWORD_ERROR,
                    error: result.data.error?result.data.error:'Неизвестная ошибка'
                });
            }
            else{
                dispatch({
                    type: actionTypes.CONFIRM_PASSWORD_ERROR,
                    error: 'ok'
                });
            }
        });
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

export function openResetPasswordForm() {
    return({ type: actionTypes.SET_RESET_PASSWORD_FORM, isOpen: true  });
}

export function closeResetPasswordForm() {
    return({ type: actionTypes.SET_RESET_PASSWORD_FORM, isOpen: false  });
}

function setLoading(dispatch, type, isLoading){
    dispatch({
        type: type,
        isLoading: isLoading
    });
}

function setError(dispatch, type, isError){
    dispatch({
        type: type,
        error: isError
    });
}