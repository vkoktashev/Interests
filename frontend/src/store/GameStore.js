import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import * as gameRequests from "../services/gameRequests";

class Game {
	game = {};
	gameState = "done";

	userInfo = { status: null, review: "", score: 0, spent_time: 0 };
	friendsInfo = [];
	userInfoState = "done";

	setStatusState = "done";

	constructor() {
		makeAutoObservable(this);
	}

	requestGame = async (id) => {
		this.gameState = "pending";
		gameRequests.getGame(id).then(this.requestGameSuccess, this.requestGameFailure);
	};
	requestGameSuccess = (result) => {
		this.game = result;
		this.gameState = "done";
	};
	requestGameFailure = (error) => {
		this.gameState = "error: " + error.response.statusText;
	};

	requestUserInfo = async (slug) => {
		this.userInfoState = "pending";
		gameRequests.getGameUserInfo(slug).then(this.requestUserInfoSuccess, this.requestUserInfoFailure);
	};
	requestUserInfoSuccess = (result) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = "done";
	};
	requestUserInfoFailure = (error) => {
		this.userInfoState = "error: " + error;
	};

	setGameStatus = async (userInfo) => {
		this.setStatusState = "pending";
		gameRequests.setGameStatus(this.game.slug, userInfo).then(this.setGameStatusSuccess, this.setGameStatusFailure);
	};
	setGameStatusSuccess = (result) => {
		this.setStatusState = "done";
	};
	setGameStatusFailure = (error) => {
		this.setStatusState = "error: " + error;
	};

	get anyError() {
		if (this.gameState.startsWith("error:")) return this.gameState;
		if (this.userInfoState.startsWith("error:")) return this.userInfoState;
		if (this.setStatusState.startsWith("error:")) return this.setStatusState;
		return null;
	}
}

const GameStore = new Game();
//export default remotedev(GameStore, { name: "Game" });
export default GameStore;
