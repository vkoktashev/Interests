import { makeAutoObservable } from "mobx";
import AuthStore from "./AuthStore";
import * as gameRequests from "../services/gameRequests";

class Game {
	game = {
		rawg: { name: "", background_image: "", background_image_additional: "", developers: [{}] },
		hltb: { game_image_url: "" },
	};
	gameIsLoading = false;
	gameError = "";

	userInfo = { status: null, review: "", score: 0, spent_time: 0 };
	friendsInfo = [];
	userInfoIsLoading = false;
	userInfoError = "";

	constructor() {
		makeAutoObservable(this);
	}

	requestGame = async (id) => {
		await AuthStore.checkAuthorization();
		this.gameIsLoading = true;
		this.gameError = "";
		gameRequests.getGame(localStorage.getItem("token"), id).then((result) => {
			if (result != null) this.game.main_info = result;
			else this.gameError = "Игра не найдена!";
			this.gameIsLoading = false;
		});
	};

	requestUserInfo = async (slug) => {
		await AuthStore.checkAuthorization();
		this.userInfoIsLoading = true;
		this.userInfoError = "";
		gameRequests.getGameUserInfo(localStorage.getItem("token"), slug).then((result) => {
			if (result != null) {
				this.userInfo = result.user_info;
				this.friendsInfo = result.friends_info;
			} else {
				this.userInfoError = "Ошибка загрузки логов";
			}
			this.userInfoIsLoading = false;
		});
	};

	setGameStatus = async (userInfo) => {
		if (await AuthStore.checkAuthorization()) {
			this.gameError = "";
			gameRequests.setGameStatus(localStorage.getItem("token"), this.game.rawg.slug, userInfo).then((result) => {
				if (!result) {
					this.gameError = "Ошибка обновления статуса";
				}
			});
		}
	};
}

const GameStore = new Game();
export default GameStore;
