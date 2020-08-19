import * as types from './actionTypes';

// Создаем reducer с начальным состоянием.
const initialState = {
    auth: { loggedIn: false },
    user: { login:"", email:"" },
    content: { 
        game: {
            rawg: {
                name: "",
                background_image: "",
                background_image_additional: "",
                developers: [{}],
            },
            hltb:{
                game_image_url: ""
            },
            user_info:{
                status: null
            }
        } 
    },
    openedPages: { LoginForm: false, RegistrateForm: false },
    errors: {auth: false, registrate: false, gameRequest: false }
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
    case types.SET_CONTENT_GAME:
        return{
            ...state,
            content: {...state.content, game: action.game}
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
    case types.GAME_REQUEST_ERROR:
        return{
            ...state,
            errors:  {...state.errors, gameRequest: action.error}
        }
    case types.SET_CONTENT_GAME_USERINFO_STATUS:
        
        return{
            ...state,
            content:  {...state.content, game: {...state.content.game, user_info: {...state.content.game.user_info, status: action.status}}}
        }
    default:
      return state;
  }
}

export function getLoggedIn(state) {
    return state.auth.loggedIn;
}

export function getAuth(state) {
    return state.auth;
}

export function getContentGame(state) {
    return state.content.game;
}

export function getAuthError(state) {
    return state.errors.auth;
}

export function getRegistrateError(state) {
    return state.errors.registrate;
}

export function getGameRequestError(state) {
    return state.errors.gameRequest;
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