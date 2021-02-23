import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
import * as userRequests from "../services/userRequests";
import * as showRequests from "../services/showRequests";

class CurrentUser {
	calendar = {};
	settings = {};
	unwatched = [];
	calendarIsLoading = true;
	settingsIsLoading = true;
	unwatchedIsLoading = true;
	calendarError = "";
	settingsError = "";
	unwatchedError = "";
	saveSettingsStatus = "";

	constructor() {
		makeAutoObservable(this);
	}

	requestCalendar = async () => {
		if (AuthStore.checkAuthorization()) {
			this.calendarIsLoading = true;
			this.calendarError = "";
			userRequests.getUserCalendar(localStorage.getItem("token")).then((result) => {
				if (result != null) {
					this.calendar = result;
				} else {
					this.calendarError = "Ошибка загрузки календаря!";
				}
				this.calendarIsLoading = false;
			});
		}
	};

	requestSettings = async () => {
		if (AuthStore.checkAuthorization()) {
			this.settingsIsLoading = true;
			this.settingsError = "";
			userRequests.getUserSettings(localStorage.getItem("token")).then((result) => {
				if (result != null) {
					this.settings = result;
				} else {
					this.settingsError = "Ошибка загрузки настроек!";
				}
				this.settingsIsLoading = false;
			});
		}
	};

	requestUnwatched = async () => {
		if (AuthStore.checkAuthorization()) {
			this.unwatchedIsLoading = true;
			this.unwatchedError = "";
			showRequests.getUnwatchedEpisodes(localStorage.getItem("token")).then((result) => {
				if (result != null) {
					this.unwatched = result;
				} else {
					this.unwatchedError = "Ошибка загрузки списка серий!";
				}
				this.unwatchedIsLoading = false;
			});
		}
	};

	patchSettings = async (settings) => {
		if (AuthStore.checkAuthorization()) {
			this.settingsIsLoading = true;
			this.saveSettingsStatus = "";
			userRequests.patchUserSettings(localStorage.getItem("token"), settings).then((result) => {
				if (!result) {
					this.saveSettingsStatus = "Ошибка сохренения настроек";
				} else {
					this.saveSettingsStatus = "Настройки сохранены!";
				}
				this.settingsIsLoading = false;
			});
		}
	};
}

const CurrentUserStore = new CurrentUser();
//export default remotedev(CurrentUserStore, { name: "CurrentUser" });
export default CurrentUserStore;
