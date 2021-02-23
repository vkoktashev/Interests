import { makeAutoObservable } from "mobx";
import remotedev from "mobx-remotedev";
import * as auth from "../services/jwtAuth";
import jwt_decode from "jwt-decode";
import { TOKEN_LIFETIME } from "../settings";
import { configure } from "mobx";

configure({
	enforceActions: "never",
});

class Auth {
	loggedIn = false;
	user = {
		username: "",
		email: "",
		id: null,
	};
	authError = "";
	registrateErrors = [];
	emailConrimStatus = "";
	resetPasswordStatus = "";
	confirmPasswordStatus = "";

	constructor() {
		makeAutoObservable(this);
	}

	tryAuth = async (login, password) => {
		this.authError = "";
		try {
			const res = await auth.getToken(login, password);
			if (res !== null) {
				localStorage.setItem("refreshToken", res.refreshToken);
				localStorage.setItem("token", res.token);
				localStorage.setItem("tokenTime", Date.now());
				this.loggedIn = true;
				this.user = res.user;
				return true;
			} else this.authError = "Ошибка авторизациии";
		} catch (error) {
			this.authError = error;
		}
		return false;
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
		this.registrateErrors = [];
		auth.registration(username, email, password).then((result) => {
			if ((result.status === 201) | (result.status === 200)) {
				this.user = { login: result.username, email: result.email };
			} else {
				let newErrors = [];
				for (let error in result.data) newErrors.push(result.data[error][0]);
				this.registrateErrors = newErrors;
			}
		});
	};

	confirmEmail = async (uid64, token) => {
		auth.confirmation(uid64, token).then((result) => {
			this.emailConrimStatus = "Почта подтверждена!";
			this.emailConrimStatus = result.data.error;
		});
	};

	resetPassword = async (email) => {
		this.resetPasswordStatus = "";
		auth.resetPassword(email).then((result) => {
			if (result.status !== 200) {
				this.resetPasswordStatus = result.data.error;
			} else {
				this.resetPasswordStatus = "ok";
			}
		});
	};

	confirmPassword = async (token, password) => {
		this.confirmPasswordStatus = "";
		auth.confirmPassword(token, password).then((result) => {
			if (result.status !== 200) {
				this.confirmPasswordStatus = result.data.error ? result.data.error : "Неизвестная ошибка";
			} else {
				this.confirmPasswordStatus = "ok";
			}
		});
	};
}

const AuthStore = new Auth();
export default remotedev(AuthStore);
