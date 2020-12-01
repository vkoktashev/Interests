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
                    review: "",
                    score: 0,
                    spent_time: 0
                }
            },
            movie: {
                tmdb: {
                    title: "",
                    poster_path: "",
                    developers: [{}],
                },
                user_info:{
                    status: null,
                    review: "",
                    score: 0,
                    spent_time: 0
                }
            } 
        },
        searchContent: {
            games: [],
            movies: [],
            users: []
        },
        userPageContent: {
            stats: {}
        },
        openedPages: { LoginForm: false, RegistrateForm: false },
        errors: {auth: false, registrate: false, gameRequest: false, movieRequest: false, userPage: false },
        isLoading: {contentGame: false, contentMovie: false, searchGames: false, searchMovies: false, userPageContent: false, searchUsers: false}
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
    case types.SET_CONTENT_MOVIE:
        return state.setIn(['content', 'movie'], action.movie);

    case types.SET_SEARCH_CONTENT_GAMES:
        return state.setIn(['searchContent', 'games'], action.games);
    case types.SET_SEARCH_CONTENT_MOVIES:
        return state.setIn(['searchContent', 'movies'], action.movies);
    case types.SET_SEARCH_CONTENT_USERS:
        return state.setIn(['searchContent', 'users'], action.users);

    case types.SET_CONTENT_GAME_USERINFO:
        return state.setIn(['content', 'game', 'user_info'], action.user_info);
    case types.SET_CONTENT_GAME_USERINFO_STATUS:
        return state.setIn(['content', 'game', 'user_info', 'status'], action.status)
    case types.SET_CONTENT_GAME_USERINFO_SCORE:
        return state.setIn(['content', 'game', 'user_info', 'score'], action.score)

    case types.SET_CONTENT_MOVIE_USERINFO:
        return state.setIn(['content', 'movie', 'user_info'], action.user_info);

    case types.SET_USER_PAGE_CONTENT:
        return state.setIn(['userPageContent'], action.content)

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
    case types.MOVIE_REQUEST_ERROR:
        return state.setIn(['errors', 'movieRequest'], action.error);
    case types.USER_PAGE_ERROR:
        return state.setIn(['errors', 'userPage'], action.error);

    case types.SET_IS_LOADING_CONTENT_GAME:
        return state.setIn(['isLoading', 'contentGame'], action.isLoading);
    case types.SET_IS_LOADING_CONTENT_MOVIE:
        return state.setIn(['isLoading', 'contentMovie'], action.isLoading);
    case types.SET_IS_LOADING_SEARCH_GAMES:
        return state.setIn(['isLoading', 'searchGames'], action.isLoading);
    case types.SET_IS_LOADING_SEARCH_MOVIES:
        return state.setIn(['isLoading', 'searchMovies'], action.isLoading);
    case types.SET_IS_LOADING_USER_PAGE_CONTENT:
        return state.setIn(['isLoading', 'userPageContent'], action.isLoading);
    case types.SET_IS_LOADING_SEARCH_USERS:
        return state.setIn(['isLoading', 'searchUsers'], action.isLoading);
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

export function getContentMovie(state) {
    return state.get('content').movie;
}

export function getSearchContentGames(state) {
    return state.get('searchContent').games;
}

export function getSearchContentMovies(state) {
    return state.get('searchContent').movies;
}

export function getSearchContentUsers(state) {
    return state.get('searchContent').users;
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

export function getMovieRequestError(state) {
    return state.get('errors').movieRequest;
}

export function getUserPageError(state) {
    return state.get('errors').userPage;
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

export function getIsLoadingContentMovie(state) {
    return state.get('isLoading').contentMovie;
}

export function getIsLoadingSearchGames(state) {
    return state.get('isLoading').searchGames;
}

export function getIsLoadingSearchMovies(state) {
    return state.get('isLoading').searchMovies;
}

export function getIsLoadingSearchUsers(state) {
    return state.get('isLoading').searchUsers;
}

export function getIsLoadingSearchAll(state) {
    return (state.get('isLoading').searchUsers || state.get('isLoading').searchMovies || state.get('isLoading').searchGames);
}

export function getIsLoadingUserPageContent(state) {
    return state.get('isLoading').userPageContent;
}

export function getUserPageContent(state){
    return state.get('userPageContent');
}