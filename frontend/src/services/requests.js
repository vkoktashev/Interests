import axios from "axios";
import {GET_GAME_URL, SEARCH_GAMES_URL} from "../settings";

let axiosConfig = {
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
};

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
 * Запрос на изменение статуса игры
 * @param {string} token Токен доступа
 * @param {string} status Статус игры
 * @param {string} gameSlug Слаг игры
 */
export async function setGameStatus(token, gameSlug, status){
    try{
        var AuthStr = 'Bearer ' + token;
        console.log(status);
        const res = await axios.put(GET_GAME_URL + gameSlug + "/", 
            {status: status, score: 0, review: "", spent_time: 0 }, { 'headers': { 'Authorization': AuthStr } });
        if (res.status === 204 || res.status === 201)
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
 */
export async function patchGameStatus(token, gameSlug, user_info){
    try{
        var AuthStr = 'Bearer ' + token;
        console.log(user_info);
        const res = await axios.patch(GET_GAME_URL + gameSlug + "/", 
        {status: user_info.status, score: user_info.score, review: user_info.review, spent_time: user_info.spent_time }, { 'headers': { 'Authorization': AuthStr } });
        if (res.status === 204 || res.status === 201)
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
export async function searchGames(query, page){
    try{
        const res = await axios.get(SEARCH_GAMES_URL, { params : {query: query, page: page} }, 
            { 'headers': { 'Content-Type': 'application/json;charset=UTF-8' } });
            console.log(res);
        return res.data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}
