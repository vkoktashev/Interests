import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
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
		await AuthStore.checkAuthorization();
		movieRequests.getMovie(localStorage.getItem("token"), id).then(this.requestMovieSuccess, this.requestMovieFailure);
	};
	requestMovieSuccess = (result) => {
		this.movie = parseMovie(result);
		this.movieState = "done";
	};
	requestMovieFailure = (error) => {
		this.movieState = "error";
	};

	requestUserInfo = async (id) => {
		this.userInfoState = "pending";
		await AuthStore.checkAuthorization();
		movieRequests.getMovieUserInfo(localStorage.getItem("token"), id).then(this.requestUserInfoSuccess, this.requestUserInfoFailure);
	};
	requestUserInfoSuccess = (result) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = "done";
	};
	requestUserInfoFailure = (error) => {
		this.userInfoState = "error";
	};

	setMovieStatus = async (userInfo) => {
		if (await AuthStore.checkAuthorization()) {
			this.setStatusState = "pending";
			movieRequests.setMovieStatus(localStorage.getItem("token"), this.movie.id, userInfo).then(this.setMovieStatusSuccess, this.setMovieStatusFailure);
		}
	};
	setMovieStatusSuccess = (result) => {
		this.setStatusState = "done";
	};
	setMovieStatusFailure = (error) => {
		this.setStatusState = "error";
	};
}

const MovieStore = new Movie();
//export default remotedev(MovieStore, { name: "Movie" });
export default MovieStore;

function parseMovie(movie) {
	let newMovie = {
		background: movie.tmdb?.backdrop_path ? "http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + movie.tmdb?.backdrop_path : "",
		poster: movie.tmdb?.poster_path,
		name: movie.tmdb.title,
		originalName: movie.tmdb.original_title,
		runtime: movie.tmdb.runtime,
		tagline: movie.tmdb.tagline,
		tmdbScore: movie.tmdb.vote_average ? movie.tmdb.vote_average * 10 : null,
		overview: movie.tmdb.overview,
		id: movie.tmdb.id,
	};

	if (movie.tmdb.genres) {
		let newGenres = "";
		for (let i = 0; i < movie.tmdb.genres.length; i++) {
			newGenres += movie.tmdb.genres[i].name;
			if (i !== movie.tmdb.genres.length - 1) newGenres += ", ";
		}
		newMovie.genres = newGenres;
	}

	if (movie.tmdb.production_companies) {
		let newCompanies = "";
		for (let i = 0; i < movie.tmdb.production_companies.length; i++) {
			newCompanies += movie.tmdb.production_companies[i].name;
			if (i !== movie.tmdb.production_companies.length - 1) newCompanies += ", ";
		}
		newMovie.companies = newCompanies;
	}

	if (movie.tmdb.cast) {
		let newCast = "";
		let length = movie.tmdb.cast.length > 5 ? 5 : movie.tmdb.cast.length;
		for (let i = 0; i < length; i++) {
			newCast += movie.tmdb.cast[i].name;
			if (i !== length - 1) newCast += ", ";
		}
		newMovie.cast = newCast;
	}

	if (movie.tmdb.crew) {
		let newDirector = "";
		for (let i = 0; i < movie.tmdb.crew.length; i++) {
			if (movie.tmdb.crew[i].job === "Director") {
				newDirector = movie.tmdb.crew[i].name;
				break;
			}
		}
		newMovie.director = newDirector;
	}

	if (movie.tmdb.release_date) {
		let mas = movie.tmdb.release_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newMovie.date = newDate;
	}
	console.log(movie);
	return newMovie;
}
