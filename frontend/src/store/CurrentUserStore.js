import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
import * as userRequests from "../services/userRequests";
import * as showRequests from "../services/showRequests";

class CurrentUser {
	calendar = {};
	settings = {};
	unwatched = [];
	calendarState = "done";
	settingsState = "done";
	unwatchedState = "done";
	saveSettingsState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	requestCalendar = async () => {
		if (AuthStore.checkAuthorization()) {
			this.calendarState = "pending";
			userRequests.getUserCalendar(localStorage.getItem("token")).then(this.requestCalendarSuccess, this.requestCalendarFailure);
		}
	};
	requestCalendarSuccess = (result) => {
		this.calendar = result;
		this.calendarState = "done";
	};
	requestCalendarFailure = (error) => {
		this.calendarState = "error: " + error;
	};

	requestSettings = async () => {
		if (AuthStore.checkAuthorization()) {
			this.settingsState = "pending";
			userRequests.getUserSettings(localStorage.getItem("token")).then(this.requestSettingsSuccess, this.requestSettingsFailure);
		}
	};
	requestSettingsSuccess = (result) => {
		this.settings = result;
		this.settingsState = "done";
	};
	requestSettingsFailure = (error) => {
		this.settingsState = "error: " + error;
	};

	requestUnwatched = async () => {
		if (AuthStore.checkAuthorization()) {
			this.unwatchedState = "pending";
			showRequests.getUnwatchedEpisodes(localStorage.getItem("token")).then(this.requestUnwatchedSuccess, this.requestUnwatchedFailure);
		}
	};
	requestUnwatchedSuccess = (result) => {
		this.unwatched = result;
		this.unwatchedState = "done";
	};
	requestUnwatchedFailure = (error) => {
		this.unwatchedState = "error: " + error;
	};

	patchSettings = async (settings) => {
		if (AuthStore.checkAuthorization()) {
			this.saveSettingsState = "pending";
			userRequests.patchUserSettings(localStorage.getItem("token"), settings).then(this.patchSettingsSuccess, this.patchSettingsFailure);
		}
	};
	patchSettingsReset = () => {
		this.saveSettingsState = "done";
	};
	patchSettingsSuccess = (result) => {
		this.unwatched = result;
		this.saveSettingsState = "saved";
		setTimeout(this.patchSettingsReset, 1000);
	};
	patchSettingsFailure = (error) => {
		this.saveSettingsState = "error: " + error;
	};
}

const CurrentUserStore = new CurrentUser();
//export default remotedev(CurrentUserStore, { name: "CurrentUser" });
export default CurrentUserStore;
