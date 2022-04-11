import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";

export interface IPagesState {
	LoginFormIsOpen: boolean;
	RegistrateFormIsOpen: boolean;
	ResetPasswordFormIsOpen: boolean;
	saveEpisodesBlockIsOpen: boolean;
	sidebarIsToggled: boolean;
	sidebarIsCollapsed: boolean;
}

class Pages implements IPagesState{
	LoginFormIsOpen = false;
	RegistrateFormIsOpen = false;
	ResetPasswordFormIsOpen = false;
	saveEpisodesBlockIsOpen = false;
	sidebarIsToggled = localStorage.getItem("sidebarToggled") === "true";
	sidebarIsCollapsed = localStorage.getItem("sidebarCollapsed") === "true";

	constructor() {
		makeAutoObservable(this);
	}

	toggleSidebar = async () => {
		this.sidebarIsToggled = !this.sidebarIsToggled;
		if (!this.sidebarIsToggled) this.sidebarIsCollapsed = false;
		localStorage.setItem("sidebarToggled", JSON.stringify(this.sidebarIsToggled));
	};

	collapseSidebar = async () => {
		this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
		localStorage.setItem("sidebarCollapsed", JSON.stringify(this.sidebarIsCollapsed));
	};

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

	setSaveEpisodes = (status: boolean) => (this.saveEpisodesBlockIsOpen = status);
}

const PagesStore = new Pages();
//export default remotedev(PagesStore, { name: "Pages" });
export default PagesStore;
