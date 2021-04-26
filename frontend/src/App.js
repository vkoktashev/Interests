import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "./store/AuthStore";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Sidebar from "./components/Sidebar";
import LoginForm from "./components/Modals/LoginForm";
import RegistrationForm from "./components/Modals/RegistrationForm";
import ResetPasswordForm from "./components/Modals/ResetPasswordForm";
import { ToastContainer } from "react-toastify";

import Routes from "./Routes";
import "react-toastify/dist/ReactToastify.css";

const App = observer((props) => {
	const { checkAuthorization } = AuthStore;

	useEffect(
		() => {
			checkAuthorization();
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	return (
		<div className='mainDiv'>
			<Router>
				<Navbar />
				<Sidebar />
				<Routes />
			</Router>
			<Footer />
			<ToastContainer position='top-center' hideProgressBar newestOnTop closeOnClick autoClose={3000} />
			<LoginForm />
			<RegistrationForm />
			<ResetPasswordForm />
		</div>
	);
});

export default App;
