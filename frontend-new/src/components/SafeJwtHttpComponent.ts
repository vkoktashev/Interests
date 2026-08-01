import axios from 'axios';
import {logout} from '@steroidsjs/core/actions/auth';
import JwtHttpComponent from '@steroidsjs/core/components/JwtHttpComponent';

interface ISafeJwtHttpComponentConfig {
	refreshTokenIgnoredUrls?: string[];
}

export default class SafeJwtHttpComponent extends JwtHttpComponent {
	private _refreshTokenIgnoredUrls: string[];

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

				this.removeAccessToken();

				try {
					const response = await this.send(
						this.refreshTokenRequest.method,
						this.refreshTokenRequest.url,
						{[this.refreshTokenKey]: this._refreshToken},
					);
					const accessToken = response?.data?.[this.accessTokenKey];

					if (accessToken) {
						this.setAccessToken(accessToken);
						originalRequest._isRetry = true;
						originalRequest.headers = {
							...originalRequest.headers,
							Authorization: `Bearer ${accessToken}`,
						};

						return axiosInstance.request(originalRequest);
					}
				} catch {
					this._components.store.dispatch(logout());
					throw error;
				}

				this._components.store.dispatch(logout());
				throw error;
			},
		);
	}
}
