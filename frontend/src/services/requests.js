import axios from "axios";
//import {HOMES_URL} from "../settings";

/**
 * Запрос к бд, получающий список домов в определенном городе  
 * @param {string} city  Название города
 * @returns {Array} Массив объектов домов. Возвращает false в случае неудачного запроса 
 
export async function getHouses(city, token) {
    try{
        var AuthStr = 'Bearer ' + token;
        //const res = await axios.get(HOMES_URL, { params: { city: city } }, { 'headers': { 'Authorization': AuthStr } });
        const res = await axios.get(HOMES_URL + city + '/', { 'headers': { 'Authorization': AuthStr } });
        let data = res.data.homes;	
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e);
        return null;
    }
}*/


