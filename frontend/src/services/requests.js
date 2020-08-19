import axios from "axios";
import {GET_GAME_URL} from "../settings";

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
export async function getGame(id) {
    try{
        //var AuthStr = 'Bearer ' + token;
        //const res = await axios.get(HOMES_URL, { params: { city: city } }, { 'headers': { 'Authorization': AuthStr } });
        const res = await axios.get(GET_GAME_URL + id, axiosConfig);
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
    var AuthStr = 'Bearer ' + token;
    const res = await axios.put(GET_GAME_URL + gameSlug + '/set-status', 
        { params: {status: 'playing'} }, { 'headers': { 'Authorization': AuthStr } });
}


