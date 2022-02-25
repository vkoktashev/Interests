import { makeAutoObservable } from 'mobx';
//import remotedev from 'mobx-remotedev';
import * as gameRequests from '../services/gameRequests';
import { toast } from 'react-toastify';

type IPendingState = 'done' | 'pending' | string;

export interface IGameUserInfo {
	status: string,
	review: string,
	score: number,
	spent_time: number,
}

export interface IGame {
	slug: string,
	[key: string]: any,
}

export interface IGameState {
	game: IGame,
	gameState: IPendingState,
	userInfo: IGameUserInfo,
	friendsInfo: any,
	userInfoState: IPendingState,
	setStatusState: IPendingState,
	setStatusToast: any,
}

class Game implements IGameState{
	game: IGame = {slug: ''};
	gameState = 'done';

	userInfo = { status: '', review: '', score: 0, spent_time: 0 };
	friendsInfo = [];
	userInfoState = 'done';

	setStatusState = 'done';
	setStatusToast: any;

	constructor() {
		makeAutoObservable(this);
	}

	requestGame = async (id: string) => {
		this.gameState = 'pending';
		gameRequests.getGame(id).then(this.requestGameSuccess, this.requestGameFailure);
	};
	requestGameSuccess = (result: IGame) => {
		this.game = result;
		this.gameState = 'done';
	};
	requestGameFailure = (error: any) => {
		this.gameState = 'error: ' + error.response.statusText;
	};

	requestUserInfo = async (slug: string) => {
		this.userInfoState = 'pending';
		gameRequests.getGameUserInfo(slug).then(this.requestUserInfoSuccess, this.requestUserInfoFailure);
	};
	requestUserInfoSuccess = (result: any) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = 'done';
	};
	requestUserInfoFailure = (error: string) => {
		this.userInfoState = 'error: ' + error;
	};

	setGameStatus = async (userInfo: IGameUserInfo) => {
		this.setStatusState = 'pending';
		gameRequests.setGameStatus(this.game.slug, userInfo).then(this.setGameStatusSuccess, this.setGameStatusFailure);
	};
	setGameStatusSuccess = () => {
		this.setStatusState = 'done';
	};
	setGameStatusFailure = (error: string) => {
		this.setStatusState = 'error: ' + error;
	};

	setGameReview = async (userInfo: IGameUserInfo) => {
		this.setStatusState = 'pendingReview';
		this.setStatusToast = toast('Сохраняем отзыв...', { autoClose: false, type: toast.TYPE.INFO, position: 'bottom-center' });
		gameRequests.setGameStatus(this.game.slug, userInfo).then(this.setGameReviewSuccess, this.setGameReviewFailure);
	};
	setGameReviewSuccess = () => {
		toast.update(this.setStatusToast, { render: 'Отзыв сохранен!', type: toast.TYPE.SUCCESS, autoClose: 1000 });
		this.setStatusState = 'done';
	};
	setGameReviewFailure = (error: string) => {
		toast.update(this.setStatusToast, { render: 'Ошибка сохранения отзыва!', type: toast.TYPE.ERROR, autoClose: 1000 });
		this.setStatusState = 'error: ' + error;
	};

	get anyError() {
		if (this.gameState.startsWith('error:')) return this.gameState;
		if (this.userInfoState.startsWith('error:')) return this.userInfoState;
		return null;
	}
}

const GameStore = new Game();
//export default remotedev(GameStore, { name: 'Game' });
export default GameStore;
