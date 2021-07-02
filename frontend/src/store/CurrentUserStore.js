import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
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
		this.calendarState = "pending";
		userRequests.getUserCalendar().then(this.requestCalendarSuccess, this.requestCalendarFailure);
	};
	requestCalendarSuccess = (result) => {
		this.calendar = result;
		this.calendarState = "done";
	};
	requestCalendarFailure = (error) => {
		this.calendarState = "error: " + error;
	};

	requestSettings = async () => {
		this.settingsState = "pending";
		userRequests.getUserSettings().then(this.requestSettingsSuccess, this.requestSettingsFailure);
	};
	requestSettingsSuccess = (result) => {
		this.settings = result;
		this.settingsState = "done";
	};
	requestSettingsFailure = (error) => {
		this.settingsState = "error: " + error;
	};

	requestUnwatched = async () => {
		this.unwatchedState = "pending";
		showRequests.getUnwatchedEpisodes().then(this.requestUnwatchedSuccess, this.requestUnwatchedFailure);
	};
	requestUnwatchedSuccess = (result) => {
		this.unwatched = result;
		this.unwatchedState = "done";
	};
	requestUnwatchedFailure = (error) => {
		this.unwatchedState = "error: " + error;
	};

	patchSettings = async (settings) => {
		this.saveSettingsState = "pending";
		userRequests.patchUserSettings(settings).then(this.patchSettingsSuccess, this.patchSettingsFailure);
	};
	patchSettingsReset = () => {
		this.saveSettingsState = "done";
	};
	patchSettingsSuccess = (result) => {
		this.saveSettingsState = "saved";
		this.settings = result;
		setTimeout(this.patchSettingsReset, 1000);
	};
	patchSettingsFailure = (error) => {
		this.saveSettingsState = "error: " + error;
	};
}

const CurrentUserStore = new CurrentUser();
//export default remotedev(CurrentUserStore, { name: "CurrentUser" });
export default CurrentUserStore;
