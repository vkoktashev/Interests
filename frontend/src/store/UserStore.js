import { makeAutoObservable } from "mobx";
import AuthStore from "./AuthStore";
import * as userRequests from "../services/userRequests";

class User {
	user = { stats: {} };
	userLogs = { log: [] };
	userFriendsLogs = { log: [] };
	userIsLoading = false;
	userLogsIsLoading = false;
	userFriendsLogsIsLoading = false;
	userError = "";
	userLogsError = "";
	userFriendsLogsError = "";

	constructor() {
		makeAutoObservable(this);
	}

	requestUser = async (username) => {
		await AuthStore.checkAuthorization();
		this.userIsLoading = true;
		this.userError = "";
		userRequests.getUserInfo(localStorage.getItem("token"), username).then((result) => {
			if (result != null) {
				this.user = result;
			} else {
				this.userError = "Профиль не найден!";
			}
			this.userIsLoading = false;
		});
	};

	requestUserLogs = async (userID, page, resultsOnPage) => {
		await AuthStore.checkAuthorization();
		this.userLogsIsLoading = true;
		this.userLogsError = "";
		userRequests.getUserLog(localStorage.getItem("token"), userID, page, resultsOnPage).then((result) => {
			if (result != null) {
				this.userLogs = result;
			} else {
				this.userLogsError = "Ошибка загрузки логов!";
			}
			this.userLogsIsLoading = false;
		});
	};

	requestUserFriendsLogs = async (userID, page, resultsOnPage) => {
		await AuthStore.checkAuthorization();
		this.userFriendsLogsIsLoading = true;
		this.userFriendsLogsError = "";
		userRequests.getUserFriendsLog(localStorage.getItem("token"), userID, page, resultsOnPage).then((result) => {
			if (result != null) {
				this.userFriendsLogs = result;
			} else {
				this.userFriendsLogsError = "Ошибка загрузки активности друзей!";
			}
			this.userFriendsLogsIsLoading = false;
		});
	};

	setUserStatus = async (is_following, userID) => {
		if (await AuthStore.checkAuthorization()) {
			userRequests.setUserStatus(localStorage.getItem("token"), is_following, userID).then((result) => {
				if (!result) {
					this.userError = "Ошибка обновления статуса";
				} else {
					this.user.is_followed = result.is_following;
				}
			});
		}
	};
}

const UserStore = new User();
export default UserStore;
