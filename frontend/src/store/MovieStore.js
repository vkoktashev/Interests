import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as movieRequests from "../services/movieRequests";

class Movie {
	movie = { tmdb: { title: "", poster_path: "", developers: [{}] } };
	movieState = "done";

	userInfo = { status: null, review: "", score: 0, friends_info: [] };
	friendsInfo = [];
	userInfoState = "done";

	setStatusState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	requestMovie = async (id) => {
		this.movieState = "pending";
		movieRequests.getMovie(id).then(this.requestMovieSuccess, this.requestMovieFailure);
	};
	requestMovieSuccess = (result) => {
		this.movie = result;
		this.movieState = "done";
	};
	requestMovieFailure = (error) => {
		this.movieState = "error: " + error;
	};

	requestUserInfo = async (id) => {
		this.userInfoState = "pending";
		movieRequests.getMovieUserInfo(id).then(this.requestUserInfoSuccess, this.requestUserInfoFailure);
	};
	requestUserInfoSuccess = (result) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = "done";
	};
	requestUserInfoFailure = (error) => {
		this.userInfoState = "error: " + error;
	};

	setMovieStatus = async (userInfo) => {
		this.setStatusState = "pending";
		movieRequests.setMovieStatus(this.movie.id, userInfo).then(this.setMovieStatusSuccess, this.setMovieStatusFailure);
	};
	setMovieStatusSuccess = (result) => {
		this.setStatusState = "done";
	};
	setMovieStatusFailure = (error) => {
		this.setStatusState = "error: " + error;
	};

	get anyError() {
		if (this.movieState.startsWith("error:")) return this.movieState;
		if (this.userInfoState.startsWith("error:")) return this.userInfoState;
		if (this.setStatusState.startsWith("error:")) return this.setStatusState;
		return null;
	}
}

const MovieStore = new Movie();
//export default remotedev(MovieStore, { name: "Movie" });
export default MovieStore;
