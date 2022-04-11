import React, { useEffect } from "react";
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import { observer } from 'mobx-react';
import { ToastContainer } from 'react-toastify';

import Routes from './Routes';
import AuthStore from './store/AuthStore';
import Navbar from './shared/app/Navbar';
import Footer from './shared/app/Footer';
import Sidebar from './shared/app/Sidebar';
import LoginForm from './shared/Modals/LoginForm';
import RegisterForm from './shared/Modals/RegisterForm';
import ResetPasswordForm from './shared/Modals/ResetPasswordForm';

import 'react-toastify/dist/ReactToastify.css';
import './app.sass';

const App = observer(() => {
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
