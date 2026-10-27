import axios from 'axios';
import {logout} from '@steroidsjs/core/actions/auth';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import JwtHttpComponent from '@steroidsjs/core/components/JwtHttpComponent';

interface ISafeJwtHttpComponentConfig {
	refreshTokenIgnoredUrls?: string[];
}

const SESSION_EXPIRED_ERROR_KEY = 'isSessionExpired';

export const isSessionExpiredError = (error: any): boolean =>
	Boolean(error?.[SESSION_EXPIRED_ERROR_KEY]);

export default class SafeJwtHttpComponent extends JwtHttpComponent {
	private _refreshTokenIgnoredUrls: string[];
	private _refreshAccessTokenPromise: Promise<string> | null = null;
	private _sessionExpiryHandled = false;

	constructor(components: any, config: ISafeJwtHttpComponentConfig = {}) {
		super(components, config);
		this._refreshTokenIgnoredUrls = config.refreshTokenIgnoredUrls || [];
	}

	async getAxiosInstance(): Promise<any> {
		if (!this._axios) {
			this._axios = axios.create(await this.getAxiosConfig());
			this.setAuthorizedRefreshInterceptor(this._axios);
		}

		return this._axios;
	}

	onLogin(params: any) {
		this._sessionExpiryHandled = false;
		super.onLogin(params);
	}

	private setAuthorizedRefreshInterceptor(axiosInstance: any) {
		axiosInstance.interceptors.response.use(
			response => response,
			async error => {
				const originalRequest = error.config;
				const refreshUrl = this.getUrl(this.refreshTokenRequest?.url);
				const isIgnoredRequest = this._refreshTokenIgnoredUrls.some(
					url => originalRequest?.url === this.getUrl(url),
				);
				const canRefresh = error.response?.status === 401
					&& originalRequest
					&& !originalRequest._isRetry
					&& originalRequest.url !== refreshUrl
					&& !isIgnoredRequest
					&& !!this._refreshToken;

				if (!canRefresh)
					throw error;

				try {
					const accessToken = await this.refreshAccessToken();
					originalRequest._isRetry = true;
					originalRequest.headers = {
						...originalRequest.headers,
						Authorization: `Bearer ${accessToken}`,
					};

					return axiosInstance.request(originalRequest);
				} catch {
					throw this.handleSessionExpiry(error);
				}
			},
		);
	}

	private refreshAccessToken(): Promise<string> {
		if (!this._refreshAccessTokenPromise) {
			this.removeAccessToken();
			this._refreshAccessTokenPromise = this.requestAccessToken()
				.finally(() => {
					this._refreshAccessTokenPromise = null;
				});
		}

		return this._refreshAccessTokenPromise;
	}

	private async requestAccessToken(): Promise<string> {
		const response = await this.send(
			this.refreshTokenRequest.method,
			this.refreshTokenRequest.url,
			{[this.refreshTokenKey]: this._refreshToken},
		);
		const accessToken = response?.data?.[this.accessTokenKey];
		const refreshToken = response?.data?.[this.refreshTokenKey];

		if (!accessToken)
			throw new Error('Access token is missing in the refresh response.');

		this.setAccessToken(accessToken);
		if (refreshToken)
			this.setRefreshToken(refreshToken);

		this._sessionExpiryHandled = false;
		return accessToken;
	}

	private handleSessionExpiry(error: any) {
		const sessionError = error && typeof error === 'object' ? error : new Error(String(error));
		sessionError[SESSION_EXPIRED_ERROR_KEY] = true;

		if (!this._sessionExpiryHandled) {
			this._sessionExpiryHandled = true;
			this._components.store.dispatch(logout(false));
			this._components.store.dispatch(showNotification(
				'Сессия истекла. Войдите снова — выбранные отметки восстановятся.',
				'error',
			));
		}

		return sessionError;
	}
}
