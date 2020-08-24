import * as types from './actionTypes';
import { Map } from 'immutable';

// Создаем reducer с начальным состоянием.
const initialState = Map(
    {
        auth: { loggedIn: false },
        user: { username:"", email:"", id: null },
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
                    status: null,
                    score: 0
                }
            } 
        },
        searchContent: {
            games: []
        },
        openedPages: { LoginForm: false, RegistrateForm: false },
        errors: {auth: false, registrate: false, gameRequest: false },
        isLoading: {contentGame: false, searchGames: false}
    }
);

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case types.SET_USER:
        return state.setIn(['user'], action.user);
    case types.SET_AUTH:
        return state.setIn(['auth'], action.auth);
    case types.SET_CONTENT_GAME:
        return state.setIn(['content', 'game'], action.game);
    case types.SET_SEARCH_CONTENT_GAMES:
        return state.setIn(['searchContent', 'games'], action.games);
    case types.SET_CONTENT_GAME_USERINFO:
        return state.setIn(['content', 'game', 'user_info'], action.user_info);
    case types.SET_CONTENT_GAME_USERINFO_STATUS:
        return state.setIn(['content', 'game', 'user_info', 'status'], action.status)
    case types.SET_CONTENT_GAME_USERINFO_SCORE:
        return state.setIn(['content', 'game', 'user_info', 'score'], action.score)
    case types.SET_CONTENT_GAME_USERINFO_REVIEW:
        return state.setIn(['content', 'game', 'user_info', 'review'], action.review)
    case types.SET_LOGINFORM:
        return state.setIn(['openedPages', 'LoginForm'], action.isOpen);
    case types.SET_REGISTRATEFORM:
        return state.setIn(['openedPages', 'RegistrateForm'], action.isOpen);
    case types.AUTH_ERROR:
        return state.setIn(['errors', 'auth'], action.error);
    case types.REGISTRATE_ERROR:
        return state.setIn(['errors', 'registrate'], action.error);
    case types.GAME_REQUEST_ERROR:
        return state.setIn(['errors', 'gameRequest'], action.error);
    case types.SET_IS_LOADING_CONTENT_GAME:
        return state.setIn(['isLoading', 'contentGame'], action.isLoading);
    case types.SET_IS_LOADING_SEARCH_GAMES:
        return state.setIn(['isLoading', 'searchGames'], action.isLoading);
    default:
      return state;
  }
}

export function getLoggedIn(state) {
    return state.get('auth').loggedIn;
}

export function getAuth(state) {
    return state.get('auth');
}

export function getContentGame(state) {
    return state.get('content').game;
}

export function getSearchContentGames(state) {
    return state.get('searchContent').games;
}

export function getAuthError(state) {
    return state.get('errors').auth;
}

export function getRegistrateError(state) {
    return state.get('errors').registrate;
}

export function getGameRequestError(state) {
    return state.get('errors').gameRequest;
}

export function getUser(state) {
    return state.get('user');
}

export function getLoginForm(state) {
    return state.get('openedPages').LoginForm;
}

export function getRegistrateForm(state) {
    return state.get('openedPages').RegistrateForm;
}

export function getIsLoadingContentGame(state) {
    return state.get('isLoading').contentGame;
}

export function getIsLoadingSearchGames(state) {
    return state.get('isLoading').searchGames;
}