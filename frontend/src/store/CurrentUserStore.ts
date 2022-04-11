import { makeAutoObservable } from 'mobx';
//import remotedev from 'mobx-remotedev';
import * as userRequests from '../services/userRequests';
import * as showRequests from '../services/showRequests';

type IPendingState = 'done' | 'pending' | string;

export interface ICalendar {
	[key: string]: any,
}

export interface ISettings {
	[key: string]: any,
}

export interface ICurrentUser {
	calendar: ICalendar,
	settings: ISettings,
	unwatched: any,
	calendarState: IPendingState,
	settingsState: IPendingState,
	unwatchedState: IPendingState,
	saveSettingsState: IPendingState,
}

class CurrentUser {
	calendar = {};
	settings = {};
	unwatched = [];
	calendarState = 'done';
	settingsState = 'done';
	unwatchedState = 'done';
	saveSettingsState = 'done';

	constructor() {
		makeAutoObservable(this);
	}

	requestCalendar = async () => {
		this.calendarState = 'pending';
		userRequests.getUserCalendar().then(this.requestCalendarSuccess, this.requestCalendarFailure);
	};
	requestCalendarSuccess = (result: ICalendar) => {
		this.calendar = result;
		this.calendarState = 'done';
	};
	requestCalendarFailure = (error: string) => {
		this.calendarState = 'error: ' + error;
	};

	requestSettings = async () => {
		this.settingsState = 'pending';
		userRequests.getUserSettings().then(this.requestSettingsSuccess, this.requestSettingsFailure);
	};
	requestSettingsSuccess = (result: ISettings) => {
		this.settings = result;
		this.settingsState = 'done';
	};
	requestSettingsFailure = (error: string) => {
		this.settingsState = 'error: ' + error;
	};

	requestUnwatched = async () => {
		this.unwatchedState = 'pending';
		showRequests.getUnwatchedEpisodes().then(this.requestUnwatchedSuccess, this.requestUnwatchedFailure);
	};
	requestUnwatchedSuccess = (result: any) => {
		this.unwatched = result;
		this.unwatchedState = 'done';
	};
	requestUnwatchedFailure = (error: string) => {
		this.unwatchedState = 'error: ' + error;
	};

	patchSettings = async (settings: ISettings) => {
		this.saveSettingsState = 'pending';
		userRequests.patchUserSettings(settings).then(this.patchSettingsSuccess, this.patchSettingsFailure);
	};
	patchSettingsReset = () => {
		this.saveSettingsState = 'done';
	};
	patchSettingsSuccess = (result: ISettings) => {
		this.saveSettingsState = 'saved';
		this.settings = result;
		setTimeout(this.patchSettingsReset, 1000);
	};
	patchSettingsFailure = (error: string) => {
		this.saveSettingsState = 'error: ' + error;
	};
}

const CurrentUserStore = new CurrentUser();
//export default remotedev(CurrentUserStore, { name: 'CurrentUser' });
export default CurrentUserStore;
