import { makeAutoObservable } from "mobx";
import AuthStore from "./AuthStore";
import * as showRequests from "../services/showRequests";

class Show {
	show = { tmdb: { title: "", poster_path: "", developers: [{}], episode_run_time: [] } };
	showSeasons = {};
	showIsLoading = false;
	showSeasonsIsLoading = {};
	showError = "";
	showSeasonsError = "";

	userInfo = { status: null, review: "", score: 0 };
	showSeasonsUserInfo = {};
	friendsInfo = [];
	userInfoIsLoading = false;
	userInfoError = "";
	showSeasonsUserInfoIsLoading = {};
	showSeasonsUserInfoError = "";

	constructor() {
		makeAutoObservable(this);
	}

	requestShow = async (id) => {
		await AuthStore.checkAuthorization();
		this.showIsLoading = true;
		this.showError = "";
		showRequests.getShow(localStorage.getItem("token"), id).then((result) => {
			if (result != null) this.show = result;
			else this.showError = "Сериал не найден!";
			this.showIsLoading = false;
		});
	};

	requestShowSeason = async (showID, seasonNumber) => {
		await AuthStore.checkAuthorization();
		this.showIsLoading = true;
		this.showError = "";
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then((result) => {
			if (result != null) this.show = result;
			else this.showError = "Сериал не найден!";
			this.showIsLoading = false;
		});
	};

	requestShowSeasons = async (showID, seasonNumber) => {
		await AuthStore.checkAuthorization();
		this.showSeasonsIsLoading[seasonNumber] = true;
		this.showSeasonsError = "";
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then((result) => {
			if (result != null) this.showSeasons[seasonNumber] = result;
			else this.showSeasonsError = "Ошибка загрузки сезона!";

			this.showSeasonsIsLoading[seasonNumber] = false;
		});
	};

	requestShowEpisode = async (showID, seasonNumber, episodeNumber) => {
		await AuthStore.checkAuthorization();
		this.showIsLoading = true;
		this.showError = "";
		showRequests.getShowEpisode(localStorage.getItem("token"), showID, seasonNumber, episodeNumber).then((result) => {
			if (result != null) this.show = result;
			else this.showError = "Серия не найдена!";
			this.showIsLoading = false;
		});
	};

	requestShowUserInfo = async (id) => {
		if (await AuthStore.checkAuthorization()) {
			this.userInfoIsLoading = true;
			this.userInfoError = "";
			showRequests.getShowUserInfo(localStorage.getItem("token"), id).then((result) => {
				if (result != null) {
					this.userInfo = result.user_info;
					this.friendsInfo = result.friends_info;
				} else {
					this.userInfoError = "Ошибка загрузки логов!";
				}
				this.userInfoIsLoading = false;
			});
		}
	};

	requestShowSeasonUserInfo = async (showID, seasonID) => {
		if (await AuthStore.checkAuthorization()) {
			this.userInfoIsLoading = true;
			this.userInfoError = "";
			showRequests.getShowSeasonUserInfo(localStorage.getItem("token"), showID, seasonID).then((result) => {
				if (result != null) {
					this.userInfo = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info };
					this.friendsInfo = result.friends_info;
				} else {
					this.userInfoError = "Ошибка загрузки логов!";
				}
				this.userInfoIsLoading = false;
			});
		}
	};

	requestShowSeasonsUserInfo = async (showID, seasonID) => {
		if (await AuthStore.checkAuthorization()) {
			this.showSeasonsUserInfoIsLoading[seasonID] = true;
			this.showSeasonsUserInfoError = "";
			showRequests.getShowSeasonUserInfo(localStorage.getItem("token"), showID, seasonID).then((result) => {
				if (result != null) {
					this.showSeasonsUserInfo[seasonID] = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info, friends_info: result.friends_info };
				} else {
					this.showSeasonsUserInfoError = "Ошибка загрузки сезона!";
				}
				this.showSeasonsUserInfoIsLoading[seasonID] = false;
			});
		}
	};

	requestShowEpisodeUserInfo = async (showID, seasonID, episodeID) => {
		if (await AuthStore.checkAuthorization()) {
			this.userInfoIsLoading = true;
			this.userInfoError = "";
			showRequests.getShowEpisodeUserInfo(localStorage.getItem("token"), showID, seasonID, episodeID).then((result) => {
				if (result != null) {
					this.userInfo = { ...result.user_info, user_watched_show: result.user_watched_show };
					this.friendsInfo = result.friends_info;
				} else {
					this.userInfoError = "Ошибка загрузки логов!";
				}
				this.userInfoIsLoading = false;
			});
		}
	};

	setShowStatus = async (userInfo) => {
		if (await AuthStore.checkAuthorization()) {
			this.showError = "";
			showRequests.setShowStatus(localStorage.getItem("token"), this.show.tmdb.id, userInfo).then((result) => {
				if (!result) {
					this.showError = "Ошибка обновления статуса";
				}
			});
		}
	};

	setShowSeasonStatus = async (userInfo, showID, seasonNumber) => {
		if (await AuthStore.checkAuthorization()) {
			this.showError = "";
			showRequests.setShowSeasonStatus(localStorage.getItem("token"), showID, seasonNumber, userInfo).then((result) => {
				if (!result) this.showError = "Ошибка обновления статуса";
			});
		}
	};

	setShowEpisodesStatus = async (episodesList, showID, needUpdate = false) => {
		if (await AuthStore.checkAuthorization()) {
			this.showError = "";
			showRequests.setShowEpisodesStatus(localStorage.getItem("token"), showID, episodesList).then((result) => {
				if ((result.status !== 204) & (result.status !== 200) & (result.status !== 201)) {
					this.showError = "Ошибка обновления статуса";
				} else {
					if (needUpdate) {
						let seasons = [];
						for (let episode in episodesList.episodes) if (seasons.indexOf(episodesList.episodes[episode].season_number) === -1) seasons.push(episodesList.episodes[episode].season_number);

						for (let season in seasons) this.requestShowSeasonsUserInfo(showID, seasons[season]);
					}
				}
			});
		}
	};

	getShowSeason = (seasonNumber) => {
		return this.showSeasons[seasonNumber];
	};

	getShowSeasonIsLoading = (seasonNumber) => {
		return this.showSeasonsIsLoading[seasonNumber];
	};

	getShowSeasonUserInfo = (seasonNumber) => {
		return this.showSeasonsUserInfo[seasonNumber];
	};
}

const ShowStore = new Show();
export default ShowStore;
