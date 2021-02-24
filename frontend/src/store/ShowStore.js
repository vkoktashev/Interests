import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
import * as showRequests from "../services/showRequests";

class Show {
	show = {};
	showState = "done";
	userInfo = { status: null, review: "", score: 0 };
	friendsInfo = [];
	userInfoState = "done";

	showSeasons = {};
	showSeasonsState = {};
	showSeasonsUserInfo = {};
	showSeasonsUserInfoState = {};

	setStatusState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	requestShow = async (id) => {
		this.showState = "pending";
		await AuthStore.checkAuthorization();
		showRequests.getShow(localStorage.getItem("token"), id).then(this.requestShowSuccess, this.requestShowFailure);
	};
	requestShowSuccess = (result) => {
		this.show = result;
		console.log(result);
		this.showState = "done";
	};
	requestShowFailure = (error) => {
		this.showState = "error: " + error;
	};

	requestSeason = async (showID, seasonNumber) => {
		this.showState = "pending";
		await AuthStore.checkAuthorization();
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then(this.requestSeasonSuccess, this.requestSeasonFailure);
	};
	requestSeasonSuccess = (result) => {
		this.show = result;
		this.showState = "done";
	};
	requestSeasonFailure = (error) => {
		this.showState = "error: " + error;
	};

	requestSeasons = async (showID, seasonNumber) => {
		this.showSeasonsState[seasonNumber] = "pending";
		this.showSeasons[seasonNumber] = {};
		await AuthStore.checkAuthorization();
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then(
			(res) => this.requestSeasonsSuccess(res, seasonNumber),
			(res) => this.requestSeasonsFailure(res, seasonNumber)
		);
	};
	requestSeasonsSuccess = (result, seasonNumber) => {
		this.showSeasons[seasonNumber] = result;
		this.showSeasonsState[seasonNumber] = "done";
	};
	requestSeasonsFailure = (error, seasonNumber) => {
		this.showSeasonsState[seasonNumber] = "error: " + error;
	};

	requestEpisode = async (showID, seasonNumber, episodeNumber) => {
		this.showState = "pending";
		await AuthStore.checkAuthorization();
		showRequests.getShowEpisode(localStorage.getItem("token"), showID, seasonNumber, episodeNumber).then(this.requestEpisodeSuccess, this.requestEpisodeFailure);
	};
	requestEpisodeSuccess = (result) => {
		this.show = result;
		this.showState = "done";
	};
	requestEpisodeFailure = (error) => {
		this.showState = "error: " + error;
	};

	requestShowUserInfo = async (id) => {
		if (await AuthStore.checkAuthorization()) {
			this.userInfoState = "pending";
			showRequests.getShowUserInfo(localStorage.getItem("token"), id).then(this.requestShowUserInfoSuccess, this.requestShowUserInfoFailure);
		}
	};
	requestShowUserInfoSuccess = (result) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = "done";
	};
	requestShowUserInfoFailure = (error) => {
		this.userInfoState = "error: " + error;
	};

	requestSeasonUserInfo = async (showID, seasonID) => {
		if (await AuthStore.checkAuthorization()) {
			this.userInfoState = "pending";
			showRequests.getShowSeasonUserInfo(localStorage.getItem("token"), showID, seasonID).then(this.requestSeasonUserInfoSuccess, this.requestSeasonUserInfoFailure);
		}
	};
	requestSeasonUserInfoSuccess = (result) => {
		this.userInfo = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info };
		this.friendsInfo = result.friends_info;
		this.userInfoState = "done";
	};
	requestSeasonUserInfoFailure = (error) => {
		this.userInfoState = "error: " + error;
	};

	requestSeasonsUserInfo = async (showID, seasonID) => {
		this.showSeasonsUserInfo[seasonID] = {};
		if (await AuthStore.checkAuthorization()) {
			this.showSeasonsUserInfoState[seasonID] = "pending";
			showRequests.getShowSeasonUserInfo(localStorage.getItem("token"), showID, seasonID).then(
				(res) => this.requestSeasonsUserInfoSuccess(res, seasonID),
				(res) => this.requestSeasonsUserInfoFailure(res, seasonID)
			);
		}
	};
	requestSeasonsUserInfoSuccess = (result, seasonID) => {
		this.showSeasonsUserInfoState[seasonID] = "done";
		this.showSeasonsUserInfo[seasonID] = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info, friends_info: result.friends_info };
	};
	requestSeasonsUserInfoFailure = (error, seasonID) => {
		this.showSeasonsUserInfoState[seasonID] = "error: " + error;
	};

	requestEpisodeUserInfo = async (showID, seasonID, episodeID) => {
		if (await AuthStore.checkAuthorization()) {
			this.userInfoState = "pending";
			showRequests.getShowEpisodeUserInfo(localStorage.getItem("token"), showID, seasonID, episodeID).then(this.requestEpisodeUserInfoSuccess, this.requestEpisodeUserInfoFailure);
		}
	};
	requestEpisodeUserInfoSuccess = (result) => {
		this.userInfoState = "done";
		this.userInfo = { ...result.user_info, user_watched_show: result.user_watched_show };
		this.friendsInfo = result.friends_info;
	};
	requestEpisodeUserInfoFailure = (error) => {
		this.userInfoState = "error: " + error;
	};

	setShowStatus = async (userInfo) => {
		if (await AuthStore.checkAuthorization()) {
			this.setStatusState = "pending";
			showRequests.setShowStatus(localStorage.getItem("token"), this.show.id, userInfo).then(this.setShowStatusSuccess, this.setShowStatusFailure);
		}
	};
	setShowStatusSuccess = (result) => {
		this.setStatusState = "done";
	};
	setShowStatusFailure = (error) => {
		this.setStatusState = "error: " + error;
	};

	setSeasonStatus = async (userInfo, showID, seasonNumber) => {
		if (await AuthStore.checkAuthorization()) {
			this.setStatusState = "pending";
			showRequests.setShowSeasonStatus(localStorage.getItem("token"), showID, seasonNumber, userInfo).then(this.setShowStatusSuccess, this.setShowStatusFailure);
		}
	};

	setEpisodesStatus = async (episodesList, showID, needUpdate = false) => {
		if (await AuthStore.checkAuthorization()) {
			this.setStatusState = "pending";
			showRequests.setShowEpisodesStatus(localStorage.getItem("token"), showID, episodesList).then((result) => {
				if (needUpdate) {
					let seasons = [];
					for (let episode in episodesList.episodes) if (seasons.indexOf(episodesList.episodes[episode].season_number) === -1) seasons.push(episodesList.episodes[episode].season_number);

					for (let season in seasons) this.requestSeasonsUserInfo(showID, seasons[season]);
				}
				this.setShowStatusSuccess();
			}, this.setShowStatusFailure);
		}
	};

	getShowSeason = (seasonNumber) => {
		return this.showSeasons[seasonNumber];
	};

	getShowSeasonState = (seasonNumber) => {
		return this.showSeasonsState[seasonNumber];
	};

	getShowSeasonUserInfo = (seasonNumber) => {
		return this.showSeasonsUserInfo[seasonNumber];
	};
}

const ShowStore = new Show();
//export default remotedev(ShowStore, { name: "Show" });
export default ShowStore;
