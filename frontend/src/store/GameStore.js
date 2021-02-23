import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";
import AuthStore from "./AuthStore";
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
		await AuthStore.checkAuthorization();
		this.gameState = "pending";
		gameRequests.getGame(localStorage.getItem("token"), id).then(this.requestGameSuccess, this.requestGameFailure);
	};
	requestGameSuccess = (result) => {
		this.game = parseGame(result);
		this.gameState = "done";
	};
	requestGameFailure = (error) => {
		this.gameState = "error";
	};

	requestUserInfo = async (slug) => {
		await AuthStore.checkAuthorization();
		this.userInfoState = "pending";
		gameRequests.getGameUserInfo(localStorage.getItem("token"), slug).then(this.requestUserInfoSuccess, this.requestUserInfoFailure);
	};
	requestUserInfoSuccess = (result) => {
		this.userInfo = result.user_info;
		this.friendsInfo = result.friends_info;
		this.userInfoState = "done";
	};
	requestUserInfoFailure = (error) => {
		this.userInfoState = "error";
	};

	setGameStatus = async (userInfo) => {
		if (await AuthStore.checkAuthorization()) {
			this.setStatusState = "pending";
			gameRequests.setGameStatus(localStorage.getItem("token"), this.game.slug, userInfo).then(this.setGameStatusSuccess, this.setGameStatusFailure);
		}
	};
	setGameStatusSuccess = (result) => {
		this.setStatusState = "done";
	};
	setGameStatusFailure = (error) => {
		this.setStatusState = "error";
	};
}

const GameStore = new Game();
//export default remotedev(GameStore, { name: "Game" });
export default GameStore;

function parseGame(game) {
	let newGame = {
		name: game.rawg.name,
		background: game.rawg.background_image_additional ? game.rawg.background_image_additional : game.rawg.background_image,
		poster: game.rawg.background_image,
		metacritic: game.rawg.metacritic,
		overview: game.rawg.description,
		slug: game.rawg.slug,
	};

	if (game.rawg.genres) {
		let newGenres = "";
		for (let i = 0; i < game.rawg.genres.length; i++) {
			newGenres += game.rawg.genres[i].name;
			if (i !== game.rawg.genres.length - 1) newGenres += ", ";
		}
		newGame.genres = newGenres;
	}

	if (game.hltb) {
		newGame.hltb = game.hltb;
	} else if (game.rawg.playtime) {
		newGame.hltb = { gameplay_main_extra: game.rawg.playtime, gameplay_main: -1, gameplay_completionist: -1 };
	} else {
		newGame.hltb = { gameplay_main_extra: -1, gameplay_main: -1, gameplay_completionist: -1 };
	}

	if (game.rawg.developers) {
		let newDevelopers = "";
		for (let i = 0; i < game.rawg.developers.length; i++) {
			newDevelopers += game.rawg.developers[i].name;
			if (i !== game.rawg.developers.length - 1) newDevelopers += ", ";
		}
		newGame.developers = newDevelopers;
	}

	if (game.rawg.platforms) {
		let newPlatforms = "";
		for (let i = 0; i < game.rawg.platforms.length; i++) {
			newPlatforms += game.rawg.platforms[i].platform.name;
			if (i !== game.rawg.platforms.length - 1) newPlatforms += ", ";
		}
		newGame.platforms = newPlatforms;
	}

	if (game.rawg.released) {
		let mas = game.rawg.released.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newGame.date = newDate;
	}
	return newGame;
}
