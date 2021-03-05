import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as auth from "../services/jwtAuth";
import jwt_decode from "jwt-decode";
import { TOKEN_LIFETIME } from "../settings";

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
		localStorage.setItem("tokenTime", Date.now());
		this.loggedIn = true;
		this.user = res.user;
		this.authState = "done";
	};
	authFailure = (error) => {
		this.authState = "error: " + error.response.data.detail;
	};

	checkAuthorization = async () => {
		if ((localStorage.getItem("token") === null) | (Date.now() - localStorage.getItem("tokenTime") > TOKEN_LIFETIME)) {
			const res = await auth.updateToken(localStorage.getItem("refreshToken"));
			if (res !== null) {
				localStorage.setItem("token", res.token);
				localStorage.setItem("tokenTime", Date.now());
				this.loggedIn = true;
				this.user = res.user;
				return true;
			} else {
				this.resetAuthorization();
				return false;
			}
		} else {
			let userData = jwt_decode(localStorage.getItem("token"));
			this.user = { username: userData.username, id: userData.user_id, email: userData.email };
			this.loggedIn = true;
			return true;
		}
	};

	resetAuthorization = async () => {
		this.loggedIn = false;
		this.user = { username: "", id: null, email: "" };
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("token");
		localStorage.removeItem("tokenTime");
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

	get currentUser() {
		return this.user;
	}
}

const AuthStore = new Auth();
//export default remotedev(AuthStore, { name: "Auth" });
export default AuthStore;
