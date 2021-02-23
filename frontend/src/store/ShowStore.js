import { makeAutoObservable } from "mobx";
import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
import * as showRequests from "../services/showRequests";

class Show {
	show = {};
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
			if (result != null) this.show = parseShow(result);
			else this.showError = "Сериал не найден!";
			this.showIsLoading = false;
		});
	};

	requestShowSeason = async (showID, seasonNumber) => {
		await AuthStore.checkAuthorization();
		this.showIsLoading = true;
		this.showError = "";
		showRequests.getShowSeason(localStorage.getItem("token"), showID, seasonNumber).then((result) => {
			if (result != null) this.show = parseSeason(result);
			else this.showError = "Сериал не найден!";
			this.showIsLoading = false;
		});
	};

	requestShowSeasons = async (showID, seasonNumber) => {
		await AuthStore.checkAuthorization();
		this.showSeasonsIsLoading[seasonNumber] = true;
		this.showSeasonsError = "";
		this.showSeasons[seasonNumber] = {};
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
			if (result != null) this.show = parseEpisode(result);
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
			this.showSeasonsUserInfo[seasonID] = {};
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
export default remotedev(ShowStore);

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
		background: show.tmdb?.backdrop_path ? "http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + show.tmdb?.backdrop_path : "",
		poster: show.tmdb?.poster_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.poster_path : "",
		showName: show.tmdb.show.tmdb_name,
		showOriginalName: show.tmdb.show.tmdb_original_name,
		name: show.tmdb.name,
		seasonNumber: show.tmdb.season_number,
		overview: show.tmdb.overview,
		id: show.tmdb.id,
		tmdbScore: show.tmdb.vote_average ? show.tmdb.vote_average * 10 : null,
	};

	if (show.tmdb.air_date) {
		let mas = show.tmdb.air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		show.date = newDate;
	}

	return newShow;
}

function parseEpisode(show) {
	let newShow = {
		background: show.tmdb?.backdrop_path ? "http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + show.tmdb?.backdrop_path : "",
		poster: show.tmdb?.still_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.still_path : "",
		showName: show.tmdb.show.tmdb_name,
		showOriginalName: show.tmdb.show.tmdb_original_name,
		name: show.tmdb.name,
		seasonNumber: show.tmdb.season_number,
		episodeNumber: show.tmdb.episode_number,
		episodesCount: show.tmdb.episodes ? show.tmdb.episodes.length : 0,
		overview: show.tmdb.overview,
		id: show.tmdb.id,
		episodes: show.tmdb.episodes,
	};

	if (show.tmdb.air_date) {
		let mas = show.tmdb.air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.date = newDate;
	}

	return newShow;
}
