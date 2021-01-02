import axios from "axios";
import {GET_GAME_URL, SEARCH_GAMES_URL, USER_INFO_URL, SEARCH_MOVIES_URL, GET_MOVIE_URL, SEARCH_USERS_URL, SEARCH_SHOWS_URL, GET_SHOW_URL} from "../settings";

let axiosConfig = {
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
};

axios.defaults.headers.common = {
    "Content-Type": "application/json"
  }

/**
 * Запрос к бд, получающий информацию об игре
 * @param {string} token Токен доступа
 * @param {string} id ID игры  
 * @returns {object} Информация об игре
 */
export async function getGame(token, id) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_GAME_URL + id + "/", { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(GET_GAME_URL + id + "/", axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}


/**
 * Запрос к бд, получающий информацию о фильме
 * @param {string} token Токен доступа
 * @param {string} id ID фильма  
 * @returns {object} Информация о фильме
 */
export async function getMovie(token, id) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_MOVIE_URL + id + "/", { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(GET_MOVIE_URL + id + "/", axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос к бд, получающий информацию о сериале
 * @param {string} token Токен доступа
 * @param {string} id ID сериала  
 * @returns {object} Информация о сериале
 */
export async function getShow(token, id) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_SHOW_URL + id + "/", { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(GET_SHOW_URL + id + "/", axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос к бд, получающий информацию о сезоне сериала
 * @param {string} token Токен доступа
 * @param {string} showID ID сериала 
 *  * @param {string} seasonNumber номер сезона
 * @returns {object} Информация о сериале
 */
export async function getShowSeason(token, showID, seasonNumber) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonNumber, { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(GET_SHOW_URL + showID + "/season/" + seasonNumber, axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение статуса игры
 * @param {string} token Токен доступа
 * @param {object} user_info Статус игры
 * @param {string} gameSlug Слаг игры
 */
export async function setGameStatus(token, gameSlug, user_info){
    try{
        var AuthStr = 'Bearer ' + token;

        const res = await axios.put(GET_GAME_URL + gameSlug + "/", 
            user_info, { headers: { 'Authorization': AuthStr } });
        
        if (res.status === 204 || res.status === 200 || res.status === 201)
            return res.data;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение статуса фильма
 * @param {string} token Токен доступа
 * @param {object} user_info Статус фильма
 * @param {string} movieID ID фильма
 */
export async function setMovieStatus(token, id, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.put(GET_MOVIE_URL + id + "/", 
            user_info, { headers: { 'Authorization': AuthStr } });
        console.log(res); 
        
        if (res.status === 204 || res.status === 200 || res.status === 201)
            return res.data;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение статуса сериала
 * @param {string} token Токен доступа
 * @param {object} user_info Статус сериала
 * @param {string} id ID сериала
 */
export async function setShowStatus(token, id, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.put(GET_SHOW_URL + id + "/", 
            user_info, { headers: { 'Authorization': AuthStr } });
        console.log(res); 
        
        if (res.status === 204 || res.status === 200 || res.status === 201)
            return res.data;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение статуса сезона сериала
 * @param {string} token Токен доступа
 * @param {object} user_info Статус сезона сериала
 * @param {string} showID ID сериала
 *  * @param {string} seasonNumber номер сезона
 */
export async function setShowSeasonStatus(token, showID, seasonNumber, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.put(GET_SHOW_URL + showID + "/season/" + seasonNumber, 
            user_info, { headers: { 'Authorization': AuthStr } });
        console.log(res); 
        
        if (res.status === 204 || res.status === 200 || res.status === 201)
            return res.data;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на поиск игр
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchGames(query, page, gamesCount){
    try{
        const res = await axios.get(SEARCH_GAMES_URL, { params : {query: query, page: page, page_size: gamesCount} }, 
            { 'headers': { 'Content-Type': 'application/json;charset=UTF-8' } });
        console.warn(res.data);
        return res.data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на поиск фильмов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchMovies(query, page){
    try{
        const res = await axios.get(SEARCH_MOVIES_URL, { params : {query: query, page: page} }, 
            { 'headers': { 'Content-Type': 'application/json;charset=UTF-8' } });
            console.log(res);
        return res.data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на поиск сериалов
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchShows(query, page){
    try{
        const res = await axios.get(SEARCH_SHOWS_URL, { params : {query: query, page: page} }, 
            { 'headers': { 'Content-Type': 'application/json;charset=UTF-8' } });
            console.log(res);
        return res.data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на поиск пользователей
 * @param {string} query Поисковый запрос
 */
export async function searchUsers(query){
    try{
        const res = await axios.get(SEARCH_USERS_URL, { params : {query: query} }, 
            { 'headers': { 'Content-Type': 'application/json;charset=UTF-8' } });
            console.log(res);
        return res.data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос к бд, получающий информацию об игре
 * @param {string} token Токен доступа
 * @param {string} id ID игры  
 * @returns {object} Информация об игре
 */
export async function getUserInfo(token, userID) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(USER_INFO_URL + userID + "/", { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(USER_INFO_URL + userID + "/", axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение статуса пользовтеля (добавить в друзья и тд)
 * @param {string} token Токен доступа
 * @param {boolean} is_following Статус фильма
 * @param {string} userID ID пользовтеля
 */
export async function setUserStatus(token, is_following, userID){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.put(USER_INFO_URL + userID + "/follow/", 
            is_following, { headers: { 'Authorization': AuthStr } });
        console.log(res); 
        
        if (res.status === 204 || res.status === 200 || res.status === 201)
            return res.data;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос к бд, получающий лог пользователя
 * @param {string} userID ID пользователя
 * @param {string} page страница 
 * @param {int} resultsOnPage количество результатов на странице 
 */
export async function getUserLog(token, userID, page, resultsOnPage) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(USER_INFO_URL + userID + "/log/", { params : { page: page, page_size: resultsOnPage } }, { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(USER_INFO_URL + userID + "/log/", { params : { page: page, page_size: resultsOnPage } }, axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос к бд, получающий лог друзей пользователя
 * @param {string} userID ID пользователя
 * @param {int} page страница
 * @param {int} resultsOnPage количество результатов на странице 
 */
export async function getUserFriendsLog(token, userID, page, resultsOnPage) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(USER_INFO_URL + userID + "/friends_log/", { params : { page: page, page_size: resultsOnPage }, 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(USER_INFO_URL + userID + "/friends_log/", { params : { page: page, page_size: resultsOnPage } }, axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос к бд, получающий информацию об оценках друзей для игры
 * @param {string} slug slug игры
 * @param {int} page страница
 */
export async function getGameFriends(token, slug, page) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_GAME_URL + slug + "/friends_info/", { params : { page: page } , 'headers': { 'Authorization': AuthStr } });
            console.log(res);
            data = res.data;
        }else{
            const res = await axios.get(GET_GAME_URL + slug + "/friends_info/", { params : { page: page } }, axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}


/**
 * Запрос к бд, получающий информацию об оценках друзей для фильма
 * @param {string} id id фильма
 * @param {int} page страница
 */
export async function getMovieFriends(token, id, page) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_MOVIE_URL + id + "/friends_info/", { params : { page: page } , 'headers': { 'Authorization': AuthStr } });
            console.log(res);
            data = res.data;
        }else{
            const res = await axios.get(GET_MOVIE_URL + id + "/friends_info/", { params : { page: page } }, axiosConfig);
            data = res.data;
        }
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}