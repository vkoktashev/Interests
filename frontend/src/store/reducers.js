import * as types from './actionTypes';

// Создаем reducer с начальным состоянием.
const initialState = {
    auth: { loggedIn: false, token: null, tokenTime: null, error: false },
    user: { name:"", surname:"", email:"" },
    openedPages: { LoginForm: false },
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case types.SET_USER:
        return {
            ...state,
            user: action.user
        };
    case types.SET_AUTH:
        return{
            ...state,
            auth: action.auth
        }
    case types.AUTH_ERROR:
        return{
            ...state,
            auth:  {...state.auth, error: action.error}
        }
    case types.SET_LOGINFORM:
        return{
            ...state,
            openedPages:  {...state.openedPages, LoginForm: action.isOpen}
        }
    
    default:
      return state;
  }
}

export function getLoggedIn(state) {
    return state.auth.loggedIn;
}

export function getToken(state) {
    if (state)
        return state.auth.token;
}

export function getTokenTime(state) {
    if (state)
        return state.auth.tokenTime;
}

export function getAuth(state) {
    return state.auth;
}

export function getAuthError(state) {
    return state.auth.error;
}

export function getUser(state) {
    return state.user;
}

export function getLoginForm(state) {
    return state.openedPages.LoginForm;
}