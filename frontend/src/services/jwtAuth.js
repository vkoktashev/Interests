import axios from "axios";
import jwt_decode from 'jwt-decode';
import {GET_TOKEN_URL, REFRESH_TOKEN_URL, REGISTRATE_URL, CONFIRM_URL} from '../settings';

let axiosConfig = {
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
};

/**
 * ПОлучение токена авторизации. Токен сохраняется в localStorage
 * @param {string} username Имя пользователя
 * @param {string} password Пароль 
 */
export async function getToken(username, password){
    try{
        const res = await axios.post(GET_TOKEN_URL, {
                    username: username,
                    password: password 
                }, axiosConfig);

        let userData = jwt_decode(res.data.access);
        let user = {username: userData.username, id: userData.user_id, email: userData.email}

        return {token: res.data.access, refreshToken: res.data.refresh, user: user};
    }catch(e){
        console.log("axios error: " + e);
        return null;
    }
}

/**
 * Функция обновления токена
 */
export async function updateToken(refreshToken){
    if (typeof refreshToken !== 'undefined' & refreshToken != null)
        try{
            const res = await axios.post(REFRESH_TOKEN_URL, {
                        refresh: refreshToken
                    }, axiosConfig);
                    
            let userData = jwt_decode(res.data.access);
            let user = {username: userData.username, id: userData.user_id, email: userData.email};

            return {token: res.data.access, user: user};
        }catch(e){
            console.log("exios error: " + e);
            return null;
        }
    return null;
}

export async function registration(username, email, password) {
   try{
        const res = await axios.post(REGISTRATE_URL, 
            {  username: username,
                email: email, 
                password: password 
            }, axiosConfig);
        let data = res.data;	
        return data;
    }catch(e){
        console.log("AXIOS ERROR: ", e.response);
        return e.response;
    }
}

export async function confirmation(uid64, token) {
    try{
        console.log(uid64);
        console.log(token);
        const res = await axios.get(CONFIRM_URL, 
             {  
                uid64: uid64,
                token: token
             }, 
             axiosConfig);
        let data = res.data;	
        return data;
     }catch(e){
         console.log("AXIOS ERROR: ", e.response);
         return e.response;
     }
 }
