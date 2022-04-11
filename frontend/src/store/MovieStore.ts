import { makeAutoObservable } from 'mobx';
//import remotedev from 'mobx-remotedev';
import * as movieRequests from '../services/movieRequests';
import { toast } from 'react-toastify';

type IPendingState = 'done' | 'pending' | string;

export interface IMovieUserInfo {
	status: string,
	review: string,
	score: number,
	spent_time: number,
}

export interface IMovie {
	id?: number,
	[key: string]: any,
}

export interface IMovieState {
	movie: IMovie | undefined,
	movieState: IPendingState,
	userInfo: IMovieUserInfo | undefined,
	friendsInfo: any,
	userInfoState: IPendingState,
	setStatusState: IPendingState,
	setStatusToast: any,
}

class Movie implements IMovieState {
	movie: IMovie | undefined;
	movieState = 'done';

	userInfo: IMovieUserInfo | undefined;
	friendsInfo = [];
	userInfoState = 'done';

	setStatusState = 'done';
	setStatusToast: any;

	constructor() {
		makeAutoObservable(this);
	}

	requestMovie = async (id: number) => {
		this.movieState = 'pending';
		movieRequests.getMovie(id).then(this.requestMovieSuccess, this.requestMovieFailure);
	};
	requestMovieSuccess = (result: IMovie) => {
		this.movie = result;
		this.movieState = 'done';
	};
	requestMovieFailure = (error: string) => {
		this.movieState = 'error: ' + error;
	};

	requestUserInfo = async (id: number) => {
		this.userInfoState = 'pending';
		movieRequests.getMovieUserInfo(id).then(this.requestUserInfoSuccess, this.requestUserInfoFailure);
	};
	requestUserInfoSuccess = (result: any) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = 'done';
	};
	requestUserInfoFailure = (error: string) => {
		this.userInfoState = 'error: ' + error;
	};

	setMovieStatus = async (userInfo: IMovieUserInfo) => {
		this.setStatusState = 'pending';
		movieRequests.setMovieStatus(this.movie?.id, userInfo).then(this.setMovieStatusSuccess, this.setMovieStatusFailure);
	};
	setMovieStatusSuccess = () => {
		this.setStatusState = 'done';
	};
	setMovieStatusFailure = (error: string) => {
		this.setStatusState = 'error: ' + error;
	};

	setMovieReview = async (userInfo: IMovieUserInfo) => {
		this.setStatusState = 'pendingReview';
		this.setStatusToast = toast('Сохраняем отзыв...', { autoClose: false, type: toast.TYPE.INFO, position: 'bottom-center' });
		movieRequests.setMovieStatus(this.movie?.id, userInfo).then(this.setMovieReviewSuccess, this.setMovieReviewFailure);
	};
	setMovieReviewSuccess = () => {
		toast.update(this.setStatusToast, { render: 'Отзыв сохранен!', type: toast.TYPE.SUCCESS, autoClose: 1000 });
		this.setStatusState = 'done';
	};
	setMovieReviewFailure = (error: string) => {
		toast.update(this.setStatusToast, { render: 'Ошибка сохранения отзыва!', type: toast.TYPE.ERROR, autoClose: 1000 });
		this.setStatusState = 'error: ' + error;
	};

	get anyError() {
		if (this.movieState.startsWith('error:')) return this.movieState;
		if (this.userInfoState.startsWith('error:')) return this.userInfoState;
		return null;
	}
}

const MovieStore = new Movie();
//export default remotedev(MovieStore, { name: 'Movie' });
export default MovieStore;
