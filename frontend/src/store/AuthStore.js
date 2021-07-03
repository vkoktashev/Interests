import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as auth from "../services/jwtAuth";

class Auth {
	loggedIn = false;
	user = {
		username: "",
		email: "",
		id: null,
	};
	authState = "";
	registrateState = "";
	confirmEmailState = "";
	resetPasswordState = "";
	confirmPasswordState = "";

	constructor() {
		makeAutoObservable(this);
	}

	tryAuth = async (login, password) => {
		this.authState = "pending";
		auth.getToken(login, password).then(this.authSuccess, this.authFailure);
	};
	authSuccess = (res) => {
		localStorage.setItem("refreshToken", res.refreshToken);
		localStorage.setItem("token", res.token);
		this.loggedIn = true;
		this.user = res.user;
		this.authState = "done";
	};
	authFailure = (error) => {
		this.resetAuthorization();
		this.authState = "error: " + error.response.data.detail;
	};

	resetAuthorization = async () => {
		this.loggedIn = false;
		this.user = { username: "", id: null, email: "" };
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("token");
	};

	register = async (username, email, password) => {
		this.registrateState = "pending";
		auth.registration(username, email, password).then(this.registerSuccess, this.registerFailure);
	};
	registerSuccess = (result) => {
		this.user = { login: result.username, email: result.email };
		this.registrateState = "done";
	};
	registerFailure = (error) => {
		let errors = "";
		for (let error2 in error.response.data) errors += error.response.data[error2] + "\n";
		this.registrateState = "error: " + errors;
	};

	confirmEmail = async (uid64, token) => {
		this.confirmEmailState = "pending";
		auth.confirmation(uid64, token).then(this.confirmEmailSuccess, this.confirmEmailFailure);
	};
	confirmEmailSuccess = (result) => {
		this.confirmEmailState = "done";
	};
	confirmEmailFailure = (error) => {
		let errors = "";
		for (let error2 in error.response.data) errors += error.response.data[error2] + "\n";
		this.confirmEmailState = "error: " + errors;
	};

	resetPassword = async (email) => {
		this.resetPasswordState = "pending";
		auth.resetPassword(email).then(this.resetPasswordSuccess, this.resetPasswordFailure);
	};
	resetPasswordSuccess = (result) => {
		this.resetPasswordState = "done";
	};
	resetPasswordFailure = (error) => {
		this.resetPasswordState = "error: " + error;
	};

	confirmPassword = async (token, password) => {
		this.confirmPasswordState = "";
		auth.confirmPassword(token, password).then(this.confirmPasswordSuccess, this.confirmPasswordFailure);
	};
	confirmPasswordSuccess = (result) => {
		this.confirmPasswordState = "done";
	};
	confirmPasswordFailure = (error) => {
		let errors = "";
		for (let error2 in error.response.data) errors += error.response.data[error2] + "\n";
		this.confirmPasswordState = "error: " + errors;
	};

	/**
	 * Проверка авторизации
	 */
	checkAuth = async () => {
		this.authState = "pending";
		auth.updateToken(localStorage.getItem("refreshToken")).then(this.checkAuthSuccess, this.checkAuthFailure);
	};
	checkAuthSuccess = (res) => {
		localStorage.setItem("token", res?.token);
		this.loggedIn = true;
		this.user = res.user;
		this.authState = "done";
	};
	checkAuthFailure = (res) => {
		this.loggedIn = false;
		this.user = { username: "", id: null, email: "" };
		localStorage.removeItem("token");
	};

	get currentUser() {
		return this.user;
	}
}

const AuthStore = new Auth();
//export default remotedev(AuthStore, { name: "Auth" });
export default AuthStore;
