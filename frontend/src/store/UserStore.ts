import { makeAutoObservable } from 'mobx';
//import remotedev from 'mobx-remotedev';
import * as userRequests from '../services/userRequests';
import AuthStore from './AuthStore';

type IPendingState = 'done' | 'pending' | string;

export interface IUser {
	[key: string]: any,
}

class User {
	user: IUser = {};
	userLogs: any = {};
	userFriendsLogs: any = { log: [] };
	userState: IPendingState = 'done';
	userLogsState: IPendingState = 'done';
	userFriendsLogsState: IPendingState = 'done';
	setUserStatusState: IPendingState = 'done';

	constructor() {
		makeAutoObservable(this);
	}

	get isCurrentUser() {
		return AuthStore.loggedIn && parseInt(this.user.id) == AuthStore.user.id;
	}

	requestUser = async (username: string) => {
		this.userState = 'pending';
		userRequests.getUserInfo(username).then(this.requestUserSuccess, this.requestUserFailure);
	};
	requestUserSuccess = (result: IUser) => {
		this.user = result;
		this.userState = 'done';
	};
	requestUserFailure = (error: string) => {
		this.userState = 'error: ' + error;
	};

	requestUserLogs = async (userID: number, page: number, resultsOnPage: number, query: string, filters: any) => {
		this.userLogsState = 'pending';
		userRequests.getUserLog(userID, page, resultsOnPage, query, filters).then(this.requestLogsSuccess, this.requestLogsFailure);
	};
	requestLogsSuccess = (result: any) => {
		this.userLogs = result;
		this.userLogsState = 'done';
	};
	requestLogsFailure = (error: any) => {
		if (error.response.status === 403) this.userLogsState = 'forbidden';
		else this.userLogsState = 'error: ' + error;
	};
	deleteUserLog = async (logType: any, logID: any) => {
		this.userLogsState = 'pending';
		userRequests.deleteUserLog(this.user.id, logType, logID).then(() => this.deleteUserLogSuccess(logType, logID), this.deleteUserLogFailure);
	};
	deleteUserLogSuccess = (logType: any, logID: any) => {
		let newLogs = this.userLogs.log.filter((log: any) => {
			return !(log.id === logID && log.type === logType);
		});
		this.userLogs = { ...this.userLogs, log: newLogs };
		this.userLogsState = 'done';
	};
	deleteUserLogFailure = (error: any) => {
		if (error.response.status === 403) this.userLogsState = 'forbidden';
		else this.userLogsState = 'error: ' + error;
	};

	requestUserFriendsLogs = async (userID: number, page: number, resultsOnPage: number, query: string, filters: any) => {
		this.userFriendsLogsState = 'pending';
		userRequests.getUserFriendsLog(page, resultsOnPage, query, filters).then(this.requestFriendsLogsSuccess, this.requestFriendsLogsFailure);
	};
	requestFriendsLogsSuccess = (result: any) => {
		this.userFriendsLogs = result;
		this.userFriendsLogsState = 'done';
	};
	requestFriendsLogsFailure = (error: string) => {
		this.userFriendsLogsState = 'error: ' + error;
	};

	setUserStatus = async (is_following: boolean, userID: number) => {
		this.setUserStatusState = 'pending';
		userRequests.setUserStatus(is_following, userID).then(this.setUserStatusSuccess, this.setUserStatusFailure);
	};
	setUserStatusSuccess = (result: any) => {
		this.user.is_followed = result.is_following;
		this.setUserStatusState = 'done';
	};
	setUserStatusFailure = (error: string) => {
		this.setUserStatusState = 'error: ' + error;
	};
}

const UserStore = new User();
//export default remotedev(UserStore, { name: 'User' });
export default UserStore;
