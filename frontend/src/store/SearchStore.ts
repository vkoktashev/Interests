import { makeAutoObservable } from 'mobx';
import { toast } from 'react-toastify';
//import remotedev from 'mobx-remotedev';
import * as userRequests from '../services/userRequests';
import * as gameRequests from '../services/gameRequests';
import * as movieRequests from '../services/movieRequests';
import * as showRequests from '../services/showRequests';
import {IGame} from './GameStore';
import {IMovie} from './MovieStore';
import {IShow} from './ShowStore';
import {IUser} from './UserStore';

type IPendingState = 'done' | 'pending' | string;

interface ISearchResult<Type> {
	values: Array<Type>,
	page: number,
	query: string,
	isEnd?: boolean,
}

interface IHints {
	games: Array<any>,
	shows: Array<any>,
	movies: Array<any>,
	query: string,
	currentQuery?: any,
}

class Search {
	games: ISearchResult<IGame> = { values: [], page: 1, query: '' };
	movies: ISearchResult<IMovie> = { values: [], page: 1, query: '' };
	shows: ISearchResult<IShow> = { values: [], page: 1, query: '' };
	users: ISearchResult<IUser> = { values: [], page: 1, query: '' };
	hints: IHints = { games: [], shows: [], movies: [], query: '' };
	gamesState: IPendingState = 'done';
	moviesState: IPendingState = 'done';
	showsState: IPendingState = 'done';
	usersState: IPendingState = 'done';

	constructor() {
		makeAutoObservable(this);
	}

	searchHints = async (query: string) => {
		if (this.hints.query !== query) {
			this.hints.currentQuery = query;
			gameRequests.searchGamesFast(query).then(this.searchGamesHintsSuccess);
			movieRequests.searchMoviesFast(query).then(this.searchMoviesHintsSuccess);
			showRequests.searchShowsFast(query).then(this.searchShowsHintsSuccess);
		}
	};
	searchGamesHintsSuccess = (result: Array<any>) => {
		this.hints.games = result;
	};
	searchMoviesHintsSuccess = (result: Array<any>) => {
		this.hints.movies = result;
	};
	searchShowsHintsSuccess = (result: Array<any>) => {
		this.hints.shows = result;
	};

	searchGames = async (query: string) => {
		this.gamesState = 'pending';
		gameRequests.searchGames(query, 1, 20).then((res) => this.searchGamesSuccess(res, query), this.searchGamesFailure);
	};
	searchGamesSuccess = (result: Array<any>, query: string) => {
		this.games = { values: result, page: 1, query, isEnd: result.length < 20 };
		this.gamesState = 'done';
	};
	searchGamesFailure = (error: string) => {
		toast.error(`Ошибка поиска игр! ${error}`);
		this.gamesState = 'error: ' + error;
	};
	nextGames = async () => {
		if (this.gamesState === 'pending' || this.games.isEnd) return;
		this.gamesState = 'pending';
		gameRequests.searchGames(this.games.query, this.games.page + 1, 20).then(this.nextGamesSuccess, this.nextGamesFailure);
	};
	nextGamesSuccess = (result: Array<any>) => {
		this.games = { values: [...this.games.values, ...result], page: this.games.page + 1, query: this.games.query, isEnd: result.length < 20 };
		this.gamesState = 'done';
	};
	nextGamesFailure = (error: string) => {
		toast.error(`Ошибка поиска игр! ${error}`);
		this.gamesState = 'error: ' + error;
	};

	searchMovies = async (query: string) => {
		this.moviesState = 'pending';
		movieRequests.searchMovies(query, 1).then((res) => this.searchMoviesSuccess(res, query), this.searchMoviesFailure);
	};
	searchMoviesSuccess = (result: any, query: string) => {
		this.movies = { values: result.results, page: 1, query, isEnd: result.page === result.total_pages || result.total_pages === 0 };
		this.moviesState = 'done';
	};
	searchMoviesFailure = (error: string) => {
		toast.error(`Ошибка поиска фильмов! ${error}`);
		this.moviesState = 'error: ' + error;
	};
	nextMovies = async () => {
		if (this.moviesState === 'pending' || this.movies.isEnd) return;
		this.moviesState = 'pending';
		movieRequests.searchMovies(this.movies.query, this.movies.page + 1).then(this.nextMoviesSuccess, this.nextMoviesFailure);
	};
	nextMoviesSuccess = (result: any) => {
		this.movies = { values: [...this.movies.values, ...result?.results], page: this.movies.page + 1, query: this.movies.query, isEnd: result.page === result.total_pages };
		this.moviesState = 'done';
	};
	nextMoviesFailure = (error: string) => {
		toast.error(`Ошибка поиска фильмов! ${error}`);
		this.moviesState = 'error: ' + error;
	};

	searchShows = async (query: string, page?: number) => {
		this.showsState = 'pending';
		showRequests.searchShows(query, page).then((res) => this.searchShowsSuccess(res, query), this.searchShowsFailure);
	};
	searchShowsSuccess = (result: any, query: string) => {
		this.shows = { values: result.results, page: 1, query, isEnd: result.page === result.total_pages || result.total_pages === 0 };
		this.showsState = 'done';
	};
	searchShowsFailure = (error: string) => {
		toast.error(`Ошибка поиска серилов! ${error}`);
		this.showsState = 'error: ' + error;
	};
	nextShows = async () => {
		if (this.showsState === 'pending' || this.shows.isEnd) return;
		this.showsState = 'pending';
		showRequests.searchShows(this.shows.query, this.shows.page + 1).then(this.nextShowsSuccess, this.nextShowsFailure);
	};
	nextShowsSuccess = (result: any) => {
		this.shows = { values: [...this.shows.values, ...result.results], page: this.shows.page + 1, query: this.shows.query, isEnd: result.page === result.total_pages };
		this.showsState = 'done';
	};
	nextShowsFailure = (error: string) => {
		toast.error(`Ошибка поиска сериалов! ${error}`);
		this.showsState = 'error: ' + error;
	};

	searchUsers = async (query: string) => {
		this.usersState = 'pending';
		userRequests.searchUsers(query).then(this.searchUsersSuccess, this.searchUsersFailure);
	};
	searchUsersSuccess = (result: any) => {
		this.users = { values: result, page: 1, query: '' };
		this.usersState = 'done';
	};
	searchUsersFailure = (error: string) => {
		toast.error(`Ошибка поиска пользователей! ${error}`);
		this.usersState = 'error: ' + error;
	};
}

const SearchStore = new Search();
//export default remotedev(SearchStore, { name: 'Search' });
export default SearchStore;
