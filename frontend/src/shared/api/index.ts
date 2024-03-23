import axios, {Axios, AxiosRequestConfig, AxiosResponse} from 'axios';

class Api {
    protected readonly _axios: Axios;
    constructor() {
        this._axios = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            withCredentials: true,
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json',
            },
            responseType: 'json',
        });
    }

    public async get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
        return this._axios.get<T, R, D>(url, config);
    }
}

const api = new Api();

export default api;
