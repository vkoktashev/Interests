/** Время жизни токена в миллисекундах, после истечения которого будет запрошен новый токен*/
export const TOKEN_LIFETIME = 450000; 
/**Адрес сервера*/
export const BACKEND_URL = "http://127.0.0.1:8000/";
/**Адрес получения токена */
export const GET_TOKEN_URL = BACKEND_URL + "api/token/get/"; 
/**Адрес обновления токена */
export const REFRESH_TOKEN_URL = BACKEND_URL + "api/token/refresh/";