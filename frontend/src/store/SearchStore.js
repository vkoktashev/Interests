import { makeAutoObservable } from "mobx";
import { toast } from "react-toastify";
//import remotedev from "mobx-remotedev";
import * as userRequests from "../services/userRequests";
import * as gameRequests from "../services/gameRequests";
import * as movieRequests from "../services/movieRequests";
import * as showRequests from "../services/showRequests";

class Search {
	games = { values: [], page: 1, query: "" };
	movies = { values: [], page: 1, query: "" };
	shows = { values: [], page: 1, query: "" };
	users = { values: [], page: 1 };
	hints = { games: [], shows: [], movies: [], query: "" };
	gamesState = "done";
	moviesState = "done";
	showsState = "done";
	usersState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	searchHints = async (query) => {
		if (this.hints.query !== query) {
			this.hints.currentQuery = query;
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

	searchGames = async (query) => {
		this.gamesState = "pending";
		gameRequests.searchGames(query, 1, 20).then((res) => this.searchGamesSuccess(res, query), this.searchGamesFailure);
	};
	searchGamesSuccess = (result, query) => {
		this.games = { values: result, page: 1, query, isEnd: result.length < 20 };
		this.gamesState = "done";
	};
	searchGamesFailure = (error) => {
		toast.error(`Ошибка поиска игр! ${error}`);
		this.gamesState = "error: " + error;
	};
	nextGames = async () => {
		if (this.gamesState === "pending" || this.games.isEnd) return;
		this.gamesState = "pending";
		gameRequests.searchGames(this.games.query, this.games.page + 1, 20).then(this.nextGamesSuccess, this.nextGamesFailure);
	};
	nextGamesSuccess = (result) => {
		this.games = { values: [...this.games.values, ...result], page: this.games.page + 1, query: this.games.query, isEnd: result.length < 20 };
		this.gamesState = "done";
	};
	nextGamesFailure = (error) => {
		toast.error(`Ошибка поиска игр! ${error}`);
		this.gamesState = "error: " + error;
	};

	searchMovies = async (query) => {
		this.moviesState = "pending";
		movieRequests.searchMovies(query, 1).then((res) => this.searchMoviesSuccess(res, query), this.searchMoviesFailure);
	};
	searchMoviesSuccess = (result, query) => {
		this.movies = { values: result.results, page: 1, query, isEnd: result.page === result.total_pages };
		this.moviesState = "done";
	};
	searchMoviesFailure = (error) => {
		toast.error(`Ошибка поиска фильмов! ${error}`);
		this.moviesState = "error: " + error;
	};
	nextMovies = async () => {
		if (this.moviesState === "pending" || this.movies.isEnd) return;
		this.moviesState = "pending";
		movieRequests.searchMovies(this.movies.query, this.movies.page + 1, 10).then(this.nextMoviesSuccess, this.nextMoviesFailure);
	};
	nextMoviesSuccess = (result) => {
		this.movies = { values: [...this.movies.values, ...result?.results], page: this.movies.page + 1, query: this.movies.query, isEnd: result.page === result.total_pages };
		this.moviesState = "done";
	};
	nextMoviesFailure = (error) => {
		toast.error(`Ошибка поиска фильмов! ${error}`);
		this.moviesState = "error: " + error;
	};

	searchShows = async (query, page) => {
		this.showsState = "pending";
		showRequests.searchShows(query, page).then((res) => this.searchShowsSuccess(res, query), this.searchShowsFailure);
	};
	searchShowsSuccess = (result, query) => {
		this.shows = { values: result.results, page: 1, query, isEnd: result.page === result.total_pages };
		this.showsState = "done";
	};
	searchShowsFailure = (error) => {
		toast.error(`Ошибка поиска серилов! ${error}`);
		this.showsState = "error: " + error;
	};
	nextShows = async () => {
		if (this.showsState === "pending" || this.shows.isEnd) return;
		this.showsState = "pending";
		showRequests.searchShows(this.shows.query, this.shows.page + 1).then(this.nextShowsSuccess, this.nextShowsFailure);
	};
	nextShowsSuccess = (result) => {
		this.shows = { values: [...this.shows.values, ...result.results], page: this.shows.page + 1, query: this.shows.query, isEnd: result.page === result.total_pages };
		this.showsState = "done";
	};
	nextShowsFailure = (error) => {
		toast.error(`Ошибка поиска сериалов! ${error}`);
		this.showsState = "error: " + error;
	};

	searchUsers = async (query) => {
		this.usersState = "pending";
		userRequests.searchUsers(query).then(this.searchUsersSuccess, this.searchUsersFailure);
	};
	searchUsersSuccess = (result) => {
		this.users = { values: result, page: 1 };
		this.usersState = "done";
	};
	searchUsersFailure = (error) => {
		toast.error(`Ошибка поиска пользователей! ${error}`);
		this.usersState = "error: " + error;
	};
}

const SearchStore = new Search();
//export default remotedev(SearchStore, { name: "Search" });
export default SearchStore;
