import axios from "axios";
import {BACKEND_URL, REFRESH_TOKEN_URL} from "../settings";

const api = axios.create({
	baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('token')
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	if (!config.headers['Content-Type']) {
		config.headers['Content-Type'] = 'application/json';
	}
	return config;
});

api.interceptors.response.use(
	(config) => {
		return config;
	},
	async (error) => {
		const originalRequest = error.config;
		if (error.response.status === 401 && error.config && !error.config._isRetry) {
			originalRequest._isRetry = true;
			try {
				const response = await axios.post(REFRESH_TOKEN_URL, {
					refresh: localStorage.getItem("refreshToken"),
				});
				localStorage.setItem("token", response.data.access);
				return api.request(originalRequest);
			} catch (e) {
				console.log("НЕ АВТОРИЗОВАН");
			}
		}
		throw error;
	}
);

export default api;
