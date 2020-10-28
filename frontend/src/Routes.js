import React from "react";
import { Route, Switch } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import HomePage from "./components/HomePage";
import GamePage from "./components/GamePage";
import MoviePage from "./components/MoviePage";
import SearchPage from "./components/SearchPage";
import LoginForm from "./components/LoginForm";
import RegistrationForm from "./components/RegistrationForm";
import ConfirmPage from "./components/ConfirmPage";
import UserPage from "./components/UserPage";
import Navbar from "./components/Navbar";

class Routes extends React.Component {
  render() {
    return (
      <div>
        <Navbar/>
        <div className="navbar"></div>
        <Switch>
            <Route exact path="/" component={HomePage} />
            <Route exact path="/game/:id" component={GamePage} />
            <Route exact path="/movie/:id" component={MoviePage} />
            <Route exact path="/search/:query" component={SearchPage} />
            <Route exact path="/confirm/" component={ConfirmPage} />
            <Route exact path="/user/:username" component={UserPage} />
            <Route render={function () { return <h1>Not Found</h1>; }} />
        </Switch>
      <ToastContainer position="top-center" hideProgressBar newestOnTop closeOnClick/>
      <LoginForm/>
      <RegistrationForm/>
      </div>
    );
  }
}

export default Routes;