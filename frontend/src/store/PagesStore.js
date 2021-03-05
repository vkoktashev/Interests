import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";

class Pages {
	LoginFormIsOpen = false;
	RegistrateFormIsOpen = false;
	ResetPasswordFormIsOpen = false;
	saveEpisodesBlockIsOpen = false;

	constructor() {
		makeAutoObservable(this);
	}

	openLoginForm = async () => {
		this.LoginFormIsOpen = true;
	};

	closeLoginForm = async () => {
		this.LoginFormIsOpen = false;
	};

	openRegistrateForm = async () => {
		this.RegistrateFormIsOpen = true;
	};

	closeRegistrateForm = async () => {
		this.RegistrateFormIsOpen = false;
	};

	openResetPasswordForm = async () => {
		this.ResetPasswordFormIsOpen = true;
	};

	closeResetPasswordForm = async () => {
		this.ResetPasswordFormIsOpen = false;
	};

	setSaveEpisodes = (status) => (this.saveEpisodesBlockIsOpen = status);
}

const PagesStore = new Pages();
//export default remotedev(PagesStore, { name: "Pages" });
export default PagesStore;
