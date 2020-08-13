import * as types from './actionTypes';

// Создаем reducer с начальным состоянием.
const initialState = {
    auth: { loggedIn: false, token: null, tokenTime: null },
    user: { login:"", email:"" },
    openedPages: { LoginForm: false, RegistrateForm: false },
    errors: {auth: false, registrate: false}
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
            errors:  {...state.auth, auth: action.error}
        }
    case types.REGISTRATE_ERROR:
        return{
            ...state,
            errors:  {...state.auth, registrate: action.error}
        }
    case types.SET_LOGINFORM:
        return{
            ...state,
            openedPages:  {...state.openedPages, LoginForm: action.isOpen}
        }
    case types.SET_REGISTRATEFORM:
        return{
            ...state,
            openedPages:  {...state.openedPages, RegistrateForm: action.isOpen}
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
    return state.errors.auth;
}

export function getRegistrateError(state) {
    return state.errors.registrate;
}

export function getUser(state) {
    return state.user;
}

export function getLoginForm(state) {
    return state.openedPages.LoginForm;
}

export function getRegistrateForm(state) {
    return state.openedPages.RegistrateForm;
}