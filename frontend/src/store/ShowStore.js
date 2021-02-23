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
		this.show = parseShow(result);
		this.showState = "done";
	};
	requestShowFailure = (error) => {
		this.showState = "error";
	};

	requestSeason = async (showID, seasonNumber) => {
		this.showState = "pending";
		await AuthStore.checkAuthorization();
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then(this.requestSeasonSuccess, this.requestSeasonFailure);
	};
	requestSeasonSuccess = (result) => {
		this.show = parseSeason(result);
		this.showState = "done";
	};
	requestSeasonFailure = (error) => {
		this.showState = "error";
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
		this.showSeasonsState[seasonNumber] = "error";
	};

	requestEpisode = async (showID, seasonNumber, episodeNumber) => {
		this.showState = "pending";
		await AuthStore.checkAuthorization();
		showRequests.getShowEpisode(localStorage.getItem("token"), showID, seasonNumber, episodeNumber).then(this.requestEpisodeSuccess, this.requestEpisodeFailure);
	};
	requestEpisodeSuccess = (result) => {
		this.show = parseEpisode(result);
		this.showState = "done";
	};
	requestEpisodeFailure = (error) => {
		this.showState = "error";
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
		this.userInfoState = "error";
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
		this.userInfoState = "error";
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
		this.showSeasonsUserInfoState[seasonID] = "error";
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
		this.userInfoState = "error";
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
		this.setStatusState = "error";
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

					for (let season in seasons) this.requestShowSeasonsUserInfo(showID, seasons[season]);
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

function parseShow(show) {
	let newShow = {
		background: show.tmdb?.backdrop_path ? "http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + show.tmdb?.backdrop_path : "",
		poster: show.tmdb?.poster_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.poster_path : "",
		name: show.tmdb.name,
		originalName: show.tmdb.original_name,
		episodeRuntime: show.tmdb.episode_run_time.length > 0 ? show.tmdb.episode_run_time : null,
		seasonsCount: show.tmdb.number_of_seasons,
		episodesCount: show.tmdb.number_of_episodes,
		tmdbScore: show.tmdb.vote_average ? show.tmdb.vote_average * 10 : null,
		overview: show.tmdb.overview,
		id: show.tmdb.id,
		seasons: show.tmdb.seasons,
	};

	if (show.tmdb.genres) {
		let newGenres = "";
		for (let i = 0; i < show.tmdb.genres.length; i++) {
			newGenres += show.tmdb.genres[i].name;
			if (i !== show.tmdb.genres.length - 1) newGenres += ", ";
		}
		newShow.genres = newGenres;
	}

	if (show.tmdb.production_companies) {
		let newCompanies = "";
		for (let i = 0; i < show.tmdb.production_companies.length; i++) {
			newCompanies += show.tmdb.production_companies[i].name;
			if (i !== show.tmdb.production_companies.length - 1) newCompanies += ", ";
		}
		newShow.companies = newCompanies;
	}

	switch (show.tmdb.status) {
		case "Ended":
			newShow.showStatus = "Окончен";
			break;
		case "Returning Series":
			newShow.showStatus = "Продолжается";
			break;
		case "Pilot":
			newShow.showStatus = "Пилот";
			break;
		case "Canceled":
			newShow.showStatus = "Отменен";
			break;
		case "In Production":
			newShow.showStatus = "В производстве";
			break;
		case "Planned":
			newShow.showStatus = "Запланирован";
			break;
		default:
			newShow.showStatus = show.tmdb.status;
	}

	if (show.tmdb.first_air_date) {
		let mas = show.tmdb.first_air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.firstDate = newDate;
	}

	if (show.tmdb.last_air_date) {
		let mas = show.tmdb.last_air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.lastDate = newDate;
	}
	return newShow;
}

function parseSeason(show) {
	let newShow = {
		background: show.tmdb?.show?.tmdb_backdrop_path,
		poster: show.tmdb?.poster_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.poster_path : "",
		showName: show.tmdb.show.tmdb_name,
		showOriginalName: show.tmdb.show.tmdb_original_name,
		name: show.tmdb.name,
		seasonNumber: show.tmdb.season_number,
		overview: show.tmdb.overview,
		episodes: show.tmdb.episodes,
		episodesCount: show.tmdb.episodes ? show.tmdb.episodes.length : 0,
		id: show.tmdb.id,
		tmdbScore: show.tmdb.vote_average ? show.tmdb.vote_average * 10 : null,
	};

	if (show.tmdb.air_date) {
		let mas = show.tmdb.air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.date = newDate;
	}
	console.log(newShow);
	return newShow;
}

function parseEpisode(show) {
	let newShow = {
		background: show.tmdb?.show?.tmdb_backdrop_path,
		poster: show.tmdb?.still_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.still_path : "",
		showName: show.tmdb.show.tmdb_name,
		showOriginalName: show.tmdb.show.tmdb_original_name,
		name: show.tmdb.name,
		seasonNumber: show.tmdb.season_number,
		episodeNumber: show.tmdb.episode_number,
		episodesCount: show.tmdb.episodes ? show.tmdb.episodes.length : 0,
		overview: show.tmdb.overview,
		id: show.tmdb.id,
	};

	if (show.tmdb.air_date) {
		let mas = show.tmdb.air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.date = newDate;
	}
	console.log(show);
	return newShow;
}
