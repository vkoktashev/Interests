import { makeAutoObservable } from 'mobx';
//import remotedev from 'mobx-remotedev';
import * as auth from '../services/jwtAuth';

type IPendingState = 'done' | 'pending' | string;

export interface ICurrentUser {
	login?: string,
	username?: string,
	email?: string,
	id?: number | null,
}

interface IAuthState {
	loggedIn: boolean,
	user: ICurrentUser,
	authState: IPendingState,
	registrateState: IPendingState,
	confirmEmailState: IPendingState,
	resetPasswordState: IPendingState,
	confirmPasswordState: IPendingState,
}

class Auth implements IAuthState {
	loggedIn = false;
	user: ICurrentUser = {
		username: '',
		email: '',
		id: null,
	};
	authState = '';
	registrateState = '';
	confirmEmailState = '';
	resetPasswordState = '';
	confirmPasswordState = '';

	constructor() {
		makeAutoObservable(this);
	}

	tryAuth = async (login: string, password: string) => {
		this.authState = 'pending';
		auth.getToken(login, password).then(this.authSuccess, this.authFailure);
	};
	authSuccess = (res: {refreshToken: string, token: string, user: ICurrentUser}) => {
		localStorage.setItem('refreshToken', res.refreshToken);
		localStorage.setItem('token', res.token);
		this.loggedIn = true;
		this.user = res.user;
		this.authState = 'done';
	};
	authFailure = async (error: any) => {
		await this.resetAuthorization();
		this.authState = 'error: ' + error.response.data.detail;
	};

	resetAuthorization = async () => {
		this.loggedIn = false;
		this.user = { username: '', id: null, email: '' };
		localStorage.removeItem('refreshToken');
		localStorage.removeItem('token');
	};

	register = async (username: string, email: string, password: string) => {
		this.registrateState = 'pending';
		auth.registration(username, email, password).then(this.registerSuccess, this.registerFailure);
	};
	registerSuccess = (result: {username: string, email: string}) => {
		this.user = { login: result.username, email: result.email };
		this.registrateState = 'done';
	};
	registerFailure = (error: any) => {
		let errors = '';
		for (const error2 in error.response.data) {
			errors += error.response.data[error2] + '\n';
		}
		this.registrateState = 'error: ' + errors;
	};

	confirmEmail = async (uid64: string, token: string) => {
		this.confirmEmailState = 'pending';
		auth.confirmation(uid64, token).then(this.confirmEmailSuccess, this.confirmEmailFailure);
	};
	confirmEmailSuccess = () => {
		this.confirmEmailState = 'done';
	};
	confirmEmailFailure = (error: any) => {
		let errors = '';
		for (const error2 in error.response.data) {
			errors += error.response.data[error2] + '\n';
		}
		this.confirmEmailState = 'error: ' + errors;
	};

	resetPassword = async (email: string) => {
		this.resetPasswordState = 'pending';
		auth.resetPassword(email).then(this.resetPasswordSuccess, this.resetPasswordFailure);
	};
	resetPasswordSuccess = () => {
		this.resetPasswordState = 'done';
	};
	resetPasswordFailure = (error: string) => {
		this.resetPasswordState = 'error: ' + error;
	};

	confirmPassword = async (token: string, password: string) => {
		this.confirmPasswordState = '';
		auth.confirmPassword(token, password).then(this.confirmPasswordSuccess, this.confirmPasswordFailure);
	};
	confirmPasswordSuccess = () => {
		this.confirmPasswordState = 'done';
	};
	confirmPasswordFailure = (error: any) => {
		let errors = '';
		for (const error2 in error.response.data) {
			errors += error.response.data[error2] + '\n';
		}
		this.confirmPasswordState = 'error: ' + errors;
	};

	/**
	 * Проверка авторизации
	 */
	checkAuth = async () => {
		this.authState = 'pending';
		auth.updateToken(localStorage.getItem('refreshToken')).then(this.checkAuthSuccess, this.checkAuthFailure);
	};
	checkAuthSuccess = (res: {token: string, user: ICurrentUser}) => {
		localStorage.setItem('token', res?.token);
		this.loggedIn = true;
		this.user = res.user;
		this.authState = 'done';
	};
	checkAuthFailure = () => {
		this.loggedIn = false;
		this.user = { username: '', id: null, email: '' };
		localStorage.removeItem('token');
		this.authState = 'done';
	};

	get currentUser() {
		return this.user;
	}
}

const AuthStore = new Auth();
//export default remotedev(AuthStore, { name: 'Auth' });
export default AuthStore;
