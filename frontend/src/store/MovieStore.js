import { makeAutoObservable } from "mobx";
import AuthStore from "./AuthStore";
import * as movieRequests from "../services/movieRequests";

class Movie {
	movie = { tmdb: { title: "", poster_path: "", developers: [{}] } };
	movieIsLoading = false;
	movieError = "";

	userInfo = { status: null, review: "", score: 0, friends_info: [] };
	friendsInfo = [];
	userInfoIsLoading = false;
	userInfoError = "";

	constructor() {
		makeAutoObservable(this);
	}

	requestMovie = async (id) => {
		await AuthStore.checkAuthorization();
		this.movieIsLoading = true;
		this.movieError = "";
		movieRequests.getMovie(localStorage.getItem("token"), id).then((result) => {
			if (result != null) this.movieError = result;
			else this.movieError = "Фильм не найден!";
			this.movieIsLoading = false;
		});
	};

	requestMovieUserInfo = async (id) => {
		await AuthStore.checkAuthorization();
		this.userInfoIsLoading = true;
		this.userInfoError = "";
		movieRequests.getMovieUserInfo(localStorage.getItem("token"), id).then((result) => {
			if (result != null) {
				this.userInfo = result.user_info;
				this.friendsInfo = result.friends_info;
			} else {
				this.userInfoError = "Ошибка загрузки логов";
			}
			this.userInfoIsLoading = false;
		});
	};

	setMovieStatus = async (userInfo) => {
		if (await AuthStore.checkAuthorization()) {
			this.movieError = "";
			movieRequests.setMovieStatus(localStorage.getItem("token"), this.movie.tmdb.id, userInfo).then((result) => {
				if (!result) {
					this.movieError = "Ошибка обновления статуса";
				}
			});
		}
	};
}

const MovieStore = new Movie();
export default MovieStore;
