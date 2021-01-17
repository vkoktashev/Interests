import axios from "axios";
import jwt_decode from "jwt-decode";
import * as urls from "../settings";

let axiosConfig = {
	headers: {
		"Content-Type": "application/json;charset=UTF-8",
	},
};

/**
 * ПОлучение токена авторизации. Токен сохраняется в localStorage
 * @param {string} username Имя пользователя
 * @param {string} password Пароль
 */
export async function getToken(username, password) {
	try {
		const res = await axios.post(
			urls.GET_TOKEN_URL,
			{
				username: username,
				password: password,
			},
			axiosConfig
		);

		let userData = jwt_decode(res.data.access);
		let user = { username: userData.username, id: userData.user_id, email: userData.email };

		return { token: res.data.access, refreshToken: res.data.refresh, user: user };
	} catch (e) {
		console.log("axios error: " + e);
		return null;
	}
}

/**
 * Функция обновления токена
 */
export async function updateToken(refreshToken) {
	if ((typeof refreshToken !== "undefined") & (refreshToken != null))
		try {
			const res = await axios.post(
				urls.REFRESH_TOKEN_URL,
				{
					refresh: refreshToken,
				},
				axiosConfig
			);

			let userData = jwt_decode(res.data.access);
			let user = { username: userData.username, id: userData.user_id, email: userData.email };

			return { token: res.data.access, user: user };
		} catch (e) {
			console.log("exios error: " + e);
			return null;
		}
	return null;
}

export async function registration(username, email, password) {
	try {
		const res = await axios.post(
			urls.REGISTRATE_URL,
			{
				username: username,
				email: email,
				password: password,
			},
			axiosConfig
		);
		let data = res.data;
		data.status = res.status;
		return data;
	} catch (e) {
		console.log("AXIOS ERROR: ", e.response);
		return e.response;
	}
}

export async function confirmation(uid64, token) {
	try {
		const res = await axios.patch(urls.CONFIRM_URL + "?uid64=" + uid64 + "&token=" + token);
		return res;
	} catch (e) {
		console.log("AXIOS ERROR: ", e.response);
		return e.response;
	}
}

export async function resetPassword(email) {
	try {
		const res = await axios.put(urls.RESET_PASSWORD_URL, { email: email }, axiosConfig);
		return res;
	} catch (e) {
		console.log("AXIOS ERROR: ", e.response);
		return e.response;
	}
}

export async function confirmPassword(token, password) {
	try {
		const res = await axios.patch(urls.CONFIRM_PASSWORD_URL + "?reset_token=" + token, { password: password }, axiosConfig);
		return res;
	} catch (e) {
		console.log("AXIOS ERROR: ", e.response);
		return e.response;
	}
}
