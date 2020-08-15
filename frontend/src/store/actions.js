import * as actionTypes from './actionTypes';
import * as selectors from './reducers';
import {getToken, updateToken, registration} from "../services/jwtAuth";
import {TOKEN_LIFETIME} from "../settings";
import * as Requests from "../services/requests";
import { toast } from "react-toastify";

export function tryAuth(login, password) {
    return async(dispatch) => {
        dispatch({
            type: actionTypes.AUTH_ERROR,
            error: false 
        });

      try {
        const res = await getToken(login, password);
        if (res !== null){
            dispatch({
                type: actionTypes.SET_AUTH,
                auth: { loggedIn: true, token: res.token, tokenTime: Date.now()}, 
            });
            dispatch({
                type: actionTypes.SET_USER,
                user: res.user, 
            });
            dispatch({
                type: actionTypes.SET_LOGINFORM,
                isOpen: false 
            });
            localStorage.setItem('refreshToken', res.refreshToken);
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
    return async(dispatch, getState) => {
        if (selectors.getToken(getState()) == null | Date.now() - selectors.getTokenTime(getState()) > TOKEN_LIFETIME){
            const res = await updateToken(localStorage.getItem("refreshToken"));
            if (res !== null){
                dispatch({
                    type: actionTypes.SET_AUTH,
                    auth: { loggedIn: true, token: res.token, tokenTime: Date.now()}, 
                });
                dispatch({
                    type: actionTypes.SET_USER,
                    user: res.user, 
                });
                return true;
            }else{
                toast.warn("Произошла ошибка авторизации. Зайдите ещё раз");
                dispatch(resetAuthorization());
                return false;
            } 
        }else
            return true;
    }
}

export function resetAuthorization(){
    return async(dispatch) => {
        localStorage.setItem('refreshToken', null);
        dispatch({
            type: actionTypes.SET_AUTH,
            auth: { loggedIn: false, token: null, tokenTime: null}, 
        });
        dispatch({
            type: actionTypes.SET_USER,
            user: { login:"", email:"" }, 
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
        Requests.getGame(id).then((result) => {
            console.log(result);
            if (result != null){
                dispatch({
                    type: actionTypes.SET_CONTENT_GAME,
                    game: result, 
                });
            }
            else{
                toast.error("ИГра не найдена!");
                dispatch({
                    type: actionTypes.GAME_REQUEST_ERROR,
                    error: true 
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