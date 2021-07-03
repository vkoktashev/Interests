import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as showRequests from "../services/showRequests";
import { toast } from "react-toastify";

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
	setStatusToast = null;

	constructor() {
		makeAutoObservable(this);
	}

	requestShow = async (id) => {
		this.showState = "pending";
		showRequests.getShow(id).then(this.requestShowSuccess, this.requestShowFailure);
	};
	requestShowSuccess = (result) => {
		this.show = result;
		this.showState = "done";
	};
	requestShowFailure = (error) => {
		this.showState = "error: " + error;
	};

	requestSeason = async (showID, seasonNumber) => {
		this.showState = "pending";
		showRequests.getShowSeason(showID, seasonNumber).then(this.requestSeasonSuccess, this.requestSeasonFailure);
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
		showRequests.getShowSeason(showID, seasonNumber).then(
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
		showRequests.getShowEpisode(showID, seasonNumber, episodeNumber).then(this.requestEpisodeSuccess, this.requestEpisodeFailure);
	};
	requestEpisodeSuccess = (result) => {
		this.show = result;
		this.showState = "done";
	};
	requestEpisodeFailure = (error) => {
		this.showState = "error: " + error;
	};

	requestShowUserInfo = async (id) => {
		this.userInfoState = "pending";
		showRequests.getShowUserInfo(id).then(this.requestShowUserInfoSuccess, this.requestShowUserInfoFailure);
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
		this.userInfoState = "pending";
		showRequests.getShowSeasonUserInfo(showID, seasonID).then(this.requestSeasonUserInfoSuccess, this.requestSeasonUserInfoFailure);
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
		this.showSeasonsUserInfoState[seasonID] = "pending";
		showRequests.getShowSeasonUserInfo(showID, seasonID).then(
			(res) => this.requestSeasonsUserInfoSuccess(res, seasonID),
			(res) => this.requestSeasonsUserInfoFailure(res, seasonID)
		);
	};
	requestSeasonsUserInfoSuccess = (result, seasonID) => {
		this.showSeasonsUserInfoState[seasonID] = "done";
		this.showSeasonsUserInfo[seasonID] = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info, friends_info: result.friends_info };
	};
	requestSeasonsUserInfoFailure = (error, seasonID) => {
		this.showSeasonsUserInfoState[seasonID] = "error: " + error;
	};

	requestEpisodeUserInfo = async (showID, seasonID, episodeID) => {
		this.userInfoState = "pending";
		showRequests.getShowEpisodeUserInfo(showID, seasonID, episodeID).then(this.requestEpisodeUserInfoSuccess, this.requestEpisodeUserInfoFailure);
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
		this.setStatusState = "pending";
		showRequests.setShowStatus(this.show.id, userInfo).then(this.setShowStatusSuccess, this.setShowStatusFailure);
	};
	setShowStatusSuccess = (result) => {
		this.setStatusState = "done";
	};
	setShowStatusFailure = (error) => {
		this.setStatusState = "error: " + error;
	};

	setShowReview = async (userInfo) => {
		this.setStatusState = "pendingReview";
		this.setStatusToast = toast("Сохраняем отзыв...", { autoClose: false, type: toast.TYPE.INFO, position: "bottom-center" });
		showRequests.setShowStatus(this.show.id, userInfo).then(this.setShowReviewSuccess, this.setShowReviewFailure);
	};
	setShowReviewSuccess = () => {
		toast.update(this.setStatusToast, { render: "Отзыв сохранен!", type: toast.TYPE.SUCCESS, autoClose: 1000 });
		this.setStatusState = "done";
	};
	setShowReviewFailure = (error) => {
		toast.update(this.setStatusToast, { render: "Ошибка сохранения отзыва!", type: toast.TYPE.ERROR, autoClose: 1000 });
		this.setStatusState = "error: " + error;
	};

	setSeasonStatus = async (userInfo, showID, seasonNumber) => {
		this.setStatusState = "pending";
		showRequests.setShowSeasonStatus(showID, seasonNumber, userInfo).then(this.setShowStatusSuccess, this.setShowStatusFailure);
	};
	setSeasonReview = async (userInfo, showID, seasonNumber) => {
		this.setStatusState = "pendingReview";
		this.setStatusToast = toast("Сохраняем отзыв...", { autoClose: false, type: toast.TYPE.INFO, position: "bottom-center" });
		showRequests.setShowSeasonStatus(showID, seasonNumber, userInfo).then(this.setShowReviewSuccess, this.setShowReviewFailure);
	};

	setEpisodesStatus = async (episodesList, showID, seasonsToUpdate = []) => {
		this.setStatusState = "pending";
		showRequests.setShowEpisodesStatus(showID, episodesList).then((result) => {
			if (seasonsToUpdate) for (let season in seasonsToUpdate) this.requestSeasonsUserInfo(showID, seasonsToUpdate[season]);
			this.setShowStatusSuccess();
		}, this.setShowStatusFailure);
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

	getEpisodesUserInfo = (season, id) => {
		for (let episodeNumber in this.showSeasonsUserInfo[season].episodes) {
			let episode = this.showSeasonsUserInfo[season].episodes[episodeNumber];
			if (episode.tmdb_id === id) return episode;
		}
		return null;
	};

	get anySeasonLoading() {
		for (let season in this.showSeasonsState) if (this.showSeasonsState[season] === "pending") return true;
		return false;
	}

	get anyError() {
		if (this.showState.startsWith("error:")) return this.gameState;
		if (this.userInfoState.startsWith("error:")) return this.userInfoState;
		if (this.setStatusState.startsWith("error:")) return this.setStatusState;
		return null;
	}
}

const ShowStore = new Show();
//export default remotedev(ShowStore, { name: "Show" });
export default ShowStore;
