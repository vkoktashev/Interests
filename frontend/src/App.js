import React, { useEffect } from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import { QueryParamProvider } from "use-query-params";
import { observer } from "mobx-react";
import AuthStore from "./store/AuthStore";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Sidebar from "./components/Sidebar/Sidebar";
import LoginForm from "./components/Modals/LoginForm/LoginForm";
import RegisterForm from "./components/Modals/RegisterForm/RegisterForm";
import ResetPasswordForm from "./components/Modals/ResetPasswordForm/ResetPasswordForm";
import { ToastContainer } from "react-toastify";

import Routes from "./Routes";
import "react-toastify/dist/ReactToastify.css";
import "./app.sass";

const App = observer((props) => {
	const { checkAuth } = AuthStore;

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	return (
		<div className='app'>
			<div className='app__body'>
				<Router>
					<QueryParamProvider ReactRouterRoute={Route}>
						<Navbar />
						<Sidebar />
						<Routes />
						<Footer className='app__footer' />
					</QueryParamProvider>
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
