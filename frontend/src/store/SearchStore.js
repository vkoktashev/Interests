import { makeAutoObservable } from "mobx";
import remotedev from "mobx-remotedev";
import * as userRequests from "../services/userRequests";
import * as gameRequests from "../services/gameRequests";
import * as movieRequests from "../services/movieRequests";
import * as showRequests from "../services/showRequests";

class Search {
	games = [];
	movies = [];
	shows = [];
	users = [];
	gamesIsLoading = false;
	moviesIsLoading = false;
	showsIsLoading = false;
	usersIsLoading = false;
	gamesError = "";
	moviesError = "";
	showsError = "";
	usersError = "";

	constructor() {
		makeAutoObservable(this);
	}

	searchGames = async (query, page, gamesCount) => {
		this.gamesIsLoading = true;
		this.gamesError = "";
		gameRequests.searchGames(query, page, gamesCount).then((result) => {
			if (!result) {
				this.gamesError = "Ошибка поиска игр";
			} else {
				this.games = result;
			}
			this.gamesIsLoading = false;
		});
	};

	searchMovies = async (query, page) => {
		this.moviesIsLoading = true;
		this.moviesError = "";
		movieRequests.searchMovies(query, page).then((result) => {
			if (!result) {
				this.moviesError = "Ошибка поиска фильмов";
			} else {
				console.log(result);
				this.movies = result.results;
			}
			this.moviesIsLoading = false;
		});
	};

	searchShows = async (query, page) => {
		this.showsIsLoading = true;
		this.showsError = "";
		showRequests.searchShows(query, page).then((result) => {
			if (!result) {
				this.showsError = "Ошибка поиска сериалов";
			} else {
				this.shows = result.results;
			}
			this.showsIsLoading = false;
		});
	};

	searchUsers = async (query) => {
		this.usersIsLoading = true;
		this.usersError = "";
		userRequests.searchUsers(query).then((result) => {
			if (!result) {
				this.usersError = "Ошибка поиска";
			} else {
				this.users = result;
			}
			this.usersIsLoading = false;
		});
	};
}

const SearchStore = new Search();
export default remotedev(SearchStore);
