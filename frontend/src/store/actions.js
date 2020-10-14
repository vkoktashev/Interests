import * as actionTypes from './actionTypes';
import * as selectors from './reducers';
import {getToken, updateToken, registration} from "../services/jwtAuth";
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
            if (result != null){
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
                dispatch({
                    type: actionTypes.REGISTRATE_ERROR,
                    error: true 
                });
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
            console.log(result);
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