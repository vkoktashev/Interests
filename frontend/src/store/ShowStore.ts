import { makeAutoObservable } from 'mobx';
//import remotedev from 'mobx-remotedev';
import * as showRequests from '../services/showRequests';
import { toast } from 'react-toastify';

type IPendingState = 'done' | 'pending' | string;

export interface IShowUserInfo {
	status: string,
	review: string,
	score: number,
	spent_time: number,
}

export interface IShow {
	id?: number,
	[key: string]: any,
}

export interface IShowState {
	show: IShow | undefined,
	showState: IPendingState,
	userInfo: IShowUserInfo | undefined,
	friendsInfo: any,
	userInfoState: IPendingState,

	showSeasons: any,
	showSeasonsState: {[key: string]: IPendingState},
	showSeasonsUserInfo: any,
	showSeasonsUserInfoState: {[key: string]: IPendingState};

	setStatusState: IPendingState,
	setStatusToast: any,
}

class Show implements IShowState {
	show: IShow | undefined;
	showState: IPendingState = 'done';
	userInfo: IShowUserInfo | undefined;
	friendsInfo = [];
	userInfoState: IPendingState = 'done';

	showSeasons: any = {};
	showSeasonsState: {[key: string]: IPendingState} = {};
	showSeasonsUserInfo: any = {};
	showSeasonsUserInfoState: {[key: string]: IPendingState} = {};

	setStatusState: IPendingState = 'done';
	setStatusToast: any;

	constructor() {
		makeAutoObservable(this);
	}

	requestShow = async (id: number) => {
		this.showState = 'pending';
		showRequests.getShow(id).then(this.requestShowSuccess, this.requestShowFailure);
	};
	requestShowSuccess = (result: IShow) => {
		this.show = result;
		this.showState = 'done';
	};
	requestShowFailure = (error: string) => {
		this.showState = 'error: ' + error;
	};

	requestSeason = async (showID: number, seasonNumber: number) => {
		this.showState = 'pending';
		showRequests.getShowSeason(showID, seasonNumber).then(this.requestSeasonSuccess, this.requestSeasonFailure);
	};
	requestSeasonSuccess = (result: IShow) => {
		this.show = result;
		this.showState = 'done';
	};
	requestSeasonFailure = (error: any) => {
		this.showState = 'error: ' + error;
	};

	requestSeasons = async (showID: number, seasonNumber: number) => {
		this.showSeasonsState[seasonNumber] = 'pending';
		this.showSeasons[seasonNumber] = {};
		showRequests.getShowSeason(showID, seasonNumber).then(
			(res) => this.requestSeasonsSuccess(res, seasonNumber),
			(res) => this.requestSeasonsFailure(res, seasonNumber)
		);
	};
	requestSeasonsSuccess = (result: IShow, seasonNumber: number) => {
		this.showSeasons[seasonNumber] = result;
		this.showSeasonsState[seasonNumber] = 'done';
	};
	requestSeasonsFailure = (error: string, seasonNumber: number) => {
		this.showSeasonsState[seasonNumber] = 'error: ' + error;
	};

	requestEpisode = async (showID: number, seasonNumber: number, episodeNumber: number) => {
		this.showState = 'pending';
		showRequests.getShowEpisode(showID, seasonNumber, episodeNumber).then(this.requestEpisodeSuccess, this.requestEpisodeFailure);
	};
	requestEpisodeSuccess = (result: IShow) => {
		this.show = result;
		this.showState = 'done';
	};
	requestEpisodeFailure = (error: string) => {
		this.showState = 'error: ' + error;
	};

	requestShowUserInfo = async (id: number) => {
		this.userInfoState = 'pending';
		showRequests.getShowUserInfo(id).then(this.requestShowUserInfoSuccess, this.requestShowUserInfoFailure);
	};
	requestShowUserInfoSuccess = (result: any) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = 'done';
	};
	requestShowUserInfoFailure = (error: string) => {
		this.userInfoState = 'error: ' + error;
	};

	requestSeasonUserInfo = async (showID: number, seasonID: number) => {
		this.userInfoState = 'pending';
		showRequests.getShowSeasonUserInfo(showID, seasonID).then(this.requestSeasonUserInfoSuccess, this.requestSeasonUserInfoFailure);
	};
	requestSeasonUserInfoSuccess = (result: any) => {
		this.userInfo = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info };
		this.friendsInfo = result.friends_info;
		this.userInfoState = 'done';
	};
	requestSeasonUserInfoFailure = (error: string) => {
		this.userInfoState = 'error: ' + error;
	};

	requestSeasonsUserInfo = async (showID: number, seasonID: number) => {
		this.showSeasonsUserInfo[seasonID] = {};
		this.showSeasonsUserInfoState[seasonID] = 'pending';
		showRequests.getShowSeasonUserInfo(showID, seasonID).then(
			(res) => this.requestSeasonsUserInfoSuccess(res, seasonID),
			(res) => this.requestSeasonsUserInfoFailure(res, seasonID)
		);
	};
	requestSeasonsUserInfoSuccess = (result: any, seasonID: number) => {
		this.showSeasonsUserInfoState[seasonID] = 'done';
		this.showSeasonsUserInfo[seasonID] = { ...result.user_info, user_watched_show: result.user_watched_show, episodes: result.episodes_user_info, friends_info: result.friends_info };
	};
	requestSeasonsUserInfoFailure = (error: string, seasonID: number) => {
		this.showSeasonsUserInfoState[seasonID] = 'error: ' + error;
	};

	requestEpisodeUserInfo = async (showID: number, seasonID: number, episodeID: number) => {
		this.userInfoState = 'pending';
		showRequests.getShowEpisodeUserInfo(showID, seasonID, episodeID).then(this.requestEpisodeUserInfoSuccess, this.requestEpisodeUserInfoFailure);
	};
	requestEpisodeUserInfoSuccess = (result: any) => {
		this.userInfoState = 'done';
		this.userInfo = { ...result.user_info, user_watched_show: result.user_watched_show };
		this.friendsInfo = result.friends_info;
	};
	requestEpisodeUserInfoFailure = (error: string) => {
		this.userInfoState = 'error: ' + error;
	};

	setShowStatus = async (userInfo: IShowUserInfo) => {
		this.setStatusState = 'pending';
		showRequests.setShowStatus(this.show?.id, userInfo).then(this.setShowStatusSuccess, this.setShowStatusFailure);
	};
	setShowStatusSuccess = () => {
		this.setStatusState = 'done';
	};
	setShowStatusFailure = (error: string) => {
		this.setStatusState = 'error: ' + error;
	};

	setShowReview = async (userInfo: IShowUserInfo) => {
		this.setStatusState = 'pendingReview';
		this.setStatusToast = toast('Сохраняем отзыв...', { autoClose: false, type: toast.TYPE.INFO, position: 'bottom-center' });
		showRequests.setShowStatus(this.show?.id, userInfo).then(this.setShowReviewSuccess, this.setShowReviewFailure);
	};
	setShowReviewSuccess = () => {
		toast.update(this.setStatusToast, { render: 'Отзыв сохранен!', type: toast.TYPE.SUCCESS, autoClose: 1000 });
		this.setStatusState = 'done';
	};
	setShowReviewFailure = (error: string) => {
		toast.update(this.setStatusToast, { render: 'Ошибка сохранения отзыва!', type: toast.TYPE.ERROR, autoClose: 1000 });
		this.setStatusState = 'error: ' + error;
	};

	setSeasonStatus = async (userInfo: IShowUserInfo, showID: number, seasonNumber: number) => {
		this.setStatusState = 'pending';
		showRequests.setShowSeasonStatus(showID, seasonNumber, userInfo).then(this.setShowStatusSuccess, this.setShowStatusFailure);
	};
	setSeasonReview = async (userInfo: IShowUserInfo, showID: number, seasonNumber: number) => {
		this.setStatusState = 'pendingReview';
		this.setStatusToast = toast('Сохраняем отзыв...', { autoClose: false, type: toast.TYPE.INFO, position: 'bottom-center' });
		showRequests.setShowSeasonStatus(showID, seasonNumber, userInfo).then(this.setShowReviewSuccess, this.setShowReviewFailure);
	};

	setEpisodesStatus = async (episodesList: any, showID: number, seasonsToUpdate = []) => {
		this.setStatusState = 'pending';
		showRequests.setShowEpisodesStatus(showID, episodesList).then((result) => {
			if (seasonsToUpdate) for (let season in seasonsToUpdate) this.requestSeasonsUserInfo(showID, seasonsToUpdate[season]);
			this.setShowStatusSuccess();
		}, this.setShowStatusFailure);
	};

	getShowSeason = (seasonNumber: number) => {
		return this.showSeasons[seasonNumber];
	};

	getShowSeasonState = (seasonNumber: number) => {
		return this.showSeasonsState[seasonNumber];
	};

	getShowSeasonUserInfo = (seasonNumber: number) => {
		return this.showSeasonsUserInfo[seasonNumber];
	};

	getEpisodesUserInfo = (season: number, id: number) => {
		for (let episodeNumber in this.showSeasonsUserInfo[season].episodes) {
			let episode = this.showSeasonsUserInfo[season].episodes[episodeNumber];
			if (episode.tmdb_id === id) return episode;
		}
		return null;
	};

	get anySeasonLoading() {
		for (let season in this.showSeasonsState) if (this.showSeasonsState[season] === 'pending') return true;
		return false;
	}

	get anyError() {
		if (this.showState.startsWith('error:')) return this.showState;
		if (this.userInfoState.startsWith('error:')) return this.userInfoState;
		if (this.setStatusState.startsWith('error:')) return this.setStatusState;
		return null;
	}
}

const ShowStore = new Show();
//export default remotedev(ShowStore, { name: 'Show' });
export default ShowStore;
