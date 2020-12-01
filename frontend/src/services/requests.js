import axios from "axios";
import {GET_GAME_URL, SEARCH_GAMES_URL, USER_INFO_URL, SEARCH_MOVIES_URL, GET_MOVIE_URL} from "../settings";

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
 * Запрос на изменение статуса игры
 * @param {string} token Токен доступа
 * @param {object} user_info Статус игры
 * @param {string} gameSlug Слаг игры
 */
export async function setGameStatus(token, gameSlug, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        console.log(user_info);
        const res = await axios.put(GET_GAME_URL + gameSlug + "/", 
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
 * Запрос на изменение статуса фильма
 * @param {string} token Токен доступа
 * @param {object} user_info Статус фильма
 * @param {string} movieID ID фильма
 */
export async function setMovieStatus(token, id, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        console.log(user_info);
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
 * Запрос на изменение статуса игры
 * @param {string} token Токен доступа
 * @param {object} user_info Объект статуса игры
 * @param {string} gameSlug Слаг игры
 
export async function patchGameStatus(token, gameSlug, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.patch(GET_GAME_URL + gameSlug + "/", 
        {status: user_info.status, score: user_info.score, review: user_info.review, spent_time: user_info.spent_time }, { 'headers': { 'Authorization': AuthStr } });
        console.log(res.data);
        if (res.status === 204 || res.status === 201|| res.status === 200)
            return res.data;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}*/


/**
 * Запрос на поиск игр
 * @param {string} query Поисковый запрос
 * @param {int} page Страница поиска
 */
export async function searchGames(query, page){
    try{
        const res = await axios.get(SEARCH_GAMES_URL, { params : {query: query, page: page} }, 
            { 'headers': { 'Content-Type': 'application/json;charset=UTF-8' } });
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