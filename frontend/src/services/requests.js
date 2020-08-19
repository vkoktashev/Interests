import axios from "axios";
import {GET_GAME_URL} from "../settings";

/**
 * Запрос к бд, получающий список домов в определенном городе  
 * @param {string} city  Название города
 * @returns {Array} Массив объектов домов. Возвращает false в случае неудачного запроса 
 */
export async function getGame(token, id) {
    try{
        var AuthStr = 'Bearer ' + token;
        const res = await axios.get(GET_GAME_URL + id, { 'headers': { 'Authorization': AuthStr } });
        let data = res.data;	
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
        console.warn(score);
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

