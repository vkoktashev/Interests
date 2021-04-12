import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as userRequests from "../services/userRequests";
import * as gameRequests from "../services/gameRequests";
import * as movieRequests from "../services/movieRequests";
import * as showRequests from "../services/showRequests";

class Search {
	games = [];
	movies = [];
	shows = [];
	users = [];
	hints = { games: [], shows: [], movies: [] };
	currentQuery = "";
	gamesState = "done";
	moviesState = "done";
	showsState = "done";
	usersState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	searchHints = async (query) => {
		if (this.currentQuery !== query) {
			this.currentQuery = query;
			gameRequests.searchGamesFast(query).then(this.searchGamesHintsSuccess);
			movieRequests.searchMoviesFast(query).then(this.searchMoviesHintsSuccess);
			showRequests.searchShowsFast(query).then(this.searchShowsHintsSuccess);
		}
	};
	searchGamesHintsSuccess = (result) => {
		this.hints.games = result;
	};
	searchMoviesHintsSuccess = (result) => {
		this.hints.movies = result;
	};
	searchShowsHintsSuccess = (result) => {
		this.hints.shows = result;
	};

	searchGames = async (query, page, gamesCount) => {
		this.gamesState = "pending";
		gameRequests.searchGames(query, page, gamesCount).then(this.searchGamesSuccess, this.searchGamesFailure);
	};
	searchGamesSuccess = (result) => {
		this.games = result;
		this.gamesState = "done";
	};
	searchGamesFailure = (error) => {
		this.gamesState = "error: " + error;
	};

	searchMovies = async (query, page) => {
		this.moviesState = "pending";
		movieRequests.searchMovies(query, page).then(this.searchMoviesSuccess, this.searchMoviesFailure);
	};
	searchMoviesSuccess = (result) => {
		this.movies = result.results;
		this.moviesState = "done";
	};
	searchMoviesFailure = (error) => {
		this.moviesState = "error: " + error;
	};

	searchShows = async (query, page) => {
		this.showsState = "pending";
		showRequests.searchShows(query, page).then(this.searchShowsSuccess, this.searchShowsFailure);
	};
	searchShowsSuccess = (result) => {
		this.shows = result.results;
		this.showsState = "done";
	};
	searchShowsFailure = (error) => {
		this.showsState = "error: " + error;
	};

	searchUsers = async (query) => {
		this.usersState = "pending";
		userRequests.searchUsers(query).then(this.searchUsersSuccess, this.searchUsersFailure);
	};
	searchUsersSuccess = (result) => {
		this.users = result;
		this.usersState = "done";
	};
	searchUsersFailure = (error) => {
		this.usersState = "error: " + error;
	};
}

const SearchStore = new Search();
//export default remotedev(SearchStore, { name: "Search" });
export default SearchStore;
