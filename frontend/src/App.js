import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "./store/AuthStore";
import "./app.sass";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Sidebar from "./components/Sidebar/Sidebar";
import LoginForm from "./components/Modals/LoginForm/LoginForm";
import RegisterForm from "./components/Modals/RegisterForm/RegisterForm";
import ResetPasswordForm from "./components/Modals/ResetPasswordForm/ResetPasswordForm";
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
		<div className='app'>
			<div className='app__body'>
				<Router>
					<Navbar />
					<Sidebar />
					<Routes />
					<Footer className='app__footer' />
				</Router>
			</div>
			<ToastContainer position='top-center' hideProgressBar newestOnTop closeOnClick autoClose={3000} />
			<LoginForm />
			<RegisterForm />
			<ResetPasswordForm />
		</div>
	);
});

export default App;
