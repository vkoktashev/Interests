import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
import * as userRequests from "../services/userRequests";

class User {
	user = { stats: {} };
	userLogs = { log: [] };
	userFriendsLogs = { log: [] };
	userState = "done";
	userLogsState = "done";
	userFriendsLogsState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	requestUser = async (username) => {
		this.userState = "pending";
		await AuthStore.checkAuthorization();
		userRequests.getUserInfo(localStorage.getItem("token"), username).then(this.requestUserSuccess, this.requestUserFailure);
	};
	requestUserSuccess = (result) => {
		this.user = result;
		this.userState = "done";
	};
	requestUserFailure = (error) => {
		this.userState = "error";
	};

	requestUserLogs = async (userID, page, resultsOnPage) => {
		this.userLogsState = "pending";
		await AuthStore.checkAuthorization();
		userRequests.getUserLog(localStorage.getItem("token"), userID, page, resultsOnPage).then(this.requestLogsSuccess, this.requestLogsFailure);
	};
	requestLogsSuccess = (result) => {
		this.userLogs = result;
		this.userLogsState = "done";
	};
	requestLogsFailure = (error) => {
		this.userLogsState = "error";
	};

	requestUserFriendsLogs = async (userID, page, resultsOnPage) => {
		this.userFriendsLogsState = "pending";
		await AuthStore.checkAuthorization();
		userRequests.getUserFriendsLog(localStorage.getItem("token"), userID, page, resultsOnPage).then(this.requestFriendsLogsSuccess, this.requestFriendsLogsFailure);
	};
	requestFriendsLogsSuccess = (result) => {
		this.userFriendsLogs = result;
		this.userFriendsLogsState = "done";
	};
	requestFriendsLogsFailure = (error) => {
		this.userFriendsLogsState = "error";
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
//export default remotedev(UserStore, { name: "User" });
export default UserStore;
