import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as userRequests from "../services/userRequests";
import AuthStore from "./AuthStore";

class User {
	user = {};
	userLogs = {};
	userFriendsLogs = { log: [] };
	userState = "done";
	userLogsState = "done";
	userFriendsLogsState = "done";
	setUserStatusState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	get isCurrentUser() {
		return AuthStore.loggedIn && parseInt(this.user.id) === parseInt(AuthStore.user.id);
	}

	requestUser = async (username) => {
		this.userState = "pending";
		userRequests.getUserInfo(username).then(this.requestUserSuccess, this.requestUserFailure);
	};
	requestUserSuccess = (result) => {
		this.user = result;
		this.userState = "done";
	};
	requestUserFailure = (error) => {
		this.userState = "error: " + error;
	};

	requestUserLogs = async (userID, page, resultsOnPage, query, filters) => {
		this.userLogsState = "pending";
		userRequests.getUserLog(userID, page, resultsOnPage, query, filters).then(this.requestLogsSuccess, this.requestLogsFailure);
	};
	requestLogsSuccess = (result) => {
		this.userLogs = result;
		this.userLogsState = "done";
	};
	requestLogsFailure = (error) => {
		if (error.response.status === 403) this.userLogsState = "forbidden";
		else this.userLogsState = "error: " + error;
	};
	deleteUserLog = async (logType, logID) => {
		this.userLogsState = "pending";
		userRequests.deleteUserLog(this.user.id, logType, logID).then(() => this.deleteUserLogSuccess(logType, logID), this.deleteUserLogFailure);
	};
	deleteUserLogSuccess = (logType, logID) => {
		let newLogs = this.userLogs.log.filter((log) => {
			return !(log.id === logID && log.type === logType);
		});
		this.userLogs = { ...this.userLogs, log: newLogs };
		this.userLogsState = "done";
	};
	deleteUserLogFailure = (error) => {
		if (error.response.status === 403) this.userLogsState = "forbidden";
		else this.userLogsState = "error: " + error;
	};

	requestUserFriendsLogs = async (userID, page, resultsOnPage, query, filters) => {
		this.userFriendsLogsState = "pending";
		userRequests.getUserFriendsLog(page, resultsOnPage, query, filters).then(this.requestFriendsLogsSuccess, this.requestFriendsLogsFailure);
	};
	requestFriendsLogsSuccess = (result) => {
		this.userFriendsLogs = result;
		this.userFriendsLogsState = "done";
	};
	requestFriendsLogsFailure = (error) => {
		this.userFriendsLogsState = "error: " + error;
	};

	setUserStatus = async (is_following, userID) => {
		this.setUserStatusState = "pending";
		userRequests.setUserStatus(is_following, userID).then(this.setUserStatusSuccess, this.setUserStatusFailure);
	};
	setUserStatusSuccess = (result) => {
		this.user.is_followed = result.is_following;
		this.setUserStatusState = "done";
	};
	setUserStatusFailure = (error) => {
		this.setUserStatusState = "error: " + error;
	};
}

const UserStore = new User();
//export default remotedev(UserStore, { name: "User" });
export default UserStore;
