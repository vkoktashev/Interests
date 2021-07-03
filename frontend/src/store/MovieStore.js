import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as movieRequests from "../services/movieRequests";
import { toast } from "react-toastify";

class Movie {
	movie = { tmdb: { title: "", poster_path: "", developers: [{}] } };
	movieState = "done";

	userInfo = { status: null, review: "", score: 0, friends_info: [] };
	friendsInfo = [];
	userInfoState = "done";

	setStatusState = "done";
	setStatusToast = null;

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

	setMovieReview = async (userInfo) => {
		this.setStatusState = "pendingReview";
		this.setStatusToast = toast("Сохраняем отзыв...", { autoClose: false, type: toast.TYPE.INFO, position: "bottom-center" });
		movieRequests.setMovieStatus(this.movie.id, userInfo).then(this.setMovieReviewSuccess, this.setMovieReviewFailure);
	};
	setMovieReviewSuccess = () => {
		toast.update(this.setStatusToast, { render: "Отзыв сохранен!", type: toast.TYPE.SUCCESS, autoClose: 1000 });
		this.setStatusState = "done";
	};
	setMovieReviewFailure = (error) => {
		toast.update(this.setStatusToast, { render: "Ошибка сохранения отзыва!", type: toast.TYPE.ERROR, autoClose: 1000 });
		this.setStatusState = "error: " + error;
	};

	get anyError() {
		if (this.movieState.startsWith("error:")) return this.movieState;
		if (this.userInfoState.startsWith("error:")) return this.userInfoState;
		return null;
	}
}

const MovieStore = new Movie();
//export default remotedev(MovieStore, { name: "Movie" });
export default MovieStore;
