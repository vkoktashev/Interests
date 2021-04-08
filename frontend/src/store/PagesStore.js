import { makeAutoObservable } from "mobx";
//import remotedev from "mobx-remotedev";

class Pages {
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
		localStorage.setItem("sidebarToggled", this.sidebarIsToggled);
	};

	collapseSidebar = async () => {
		this.sidebarIsCollapsed = !this.sidebarIsCollapsed;
		localStorage.setItem("sidebarCollapsed", this.sidebarIsCollapsed);
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

	setSaveEpisodes = (status) => (this.saveEpisodesBlockIsOpen = status);
}

const PagesStore = new Pages();
//export default remotedev(PagesStore, { name: "Pages" });
export default PagesStore;
