import axios from "axios";
import {GET_GAME_URL, SEARCH_GAMES_URL} from "../settings";

let axiosConfig = {
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
};

/**
 * Запрос к бд, получающий список домов в определенном городе  
 * @param {string} city  Название города
 * @returns {Array} Массив объектов домов. Возвращает false в случае неудачного запроса 
 */
export async function getGame(token, id) {
    let data;
    try{
        if (token){
            var AuthStr = 'Bearer ' + token;
            const res = await axios.get(GET_GAME_URL + id, { 'headers': { 'Authorization': AuthStr } });
            data = res.data;
        }else{
            const res = await axios.get(GET_GAME_URL + id, axiosConfig);
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
export async function patchGameStatus(token, gameSlug, status){
    try{
        var AuthStr = 'Bearer ' + token;
        console.log(status);
        const res = await axios.put(GET_GAME_URL + gameSlug + '/set-status', 
            {status: status }, { 'headers': { 'Authorization': AuthStr } });
        if (res.status === 204 || res.status === 201)
            return true;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение оценки игры
 * @param {string} token Токен доступа
 * @param {int} score Оценка игры. От 1 до 10
 * @param {string} gameSlug Слаг игры
 */
export async function patchGameScore(token, gameSlug, score){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.patch(GET_GAME_URL + gameSlug + '/set-score', 
            {score: score }, { 'headers': { 'Authorization': AuthStr } });
        if (res.status === 204 || res.status === 201)
            return true;
        else return null;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}

/**
 * Запрос на изменение комментария пользователя по игре
 * @param {string} token Токен доступа
 * @param {int} review Комментарий пользовтеля по игре
 * @param {string} gameSlug Слаг игры
 */
export async function patchGameReview(token, gameSlug, review){
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.patch(GET_GAME_URL + gameSlug + '/set-review', 
            {review: review }, { 'headers': { 'Authorization': AuthStr } });

        if (res.status === 204 || res.status === 201)
            return true;
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
