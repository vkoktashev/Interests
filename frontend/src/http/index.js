import axios from "axios";
import { BACKEND_URL, REFRESH_TOKEN_URL } from "../settings";

const api = axios.create({
	baseURL: BACKEND_URL,
});

api.interceptors.request.use((config) => {
	config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
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
				const response = await axios.post(BACKEND_URL + REFRESH_TOKEN_URL, {
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
