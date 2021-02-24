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
	gamesState = "done";
	moviesState = "done";
	showsState = "done";
	usersState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	searchGames = async (query, page, gamesCount) => {
		this.gamesState = "pending";
		gameRequests.searchGames(query, page, gamesCount).then(this.searchGamesSuccess, this.searchGamesFailure);
	};
	searchGamesSuccess = (result) => {
		this.games = result;
		this.gamesState = "done";
	};
	searchGamesFailure = (error) => {
		this.gamesState = "error";
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
		this.moviesState = "error";
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
		this.showsState = "error";
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
		this.usersState = "error";
	};
}

const SearchStore = new Search();
//export default remotedev(SearchStore, { name: "Search" });
export default SearchStore;
