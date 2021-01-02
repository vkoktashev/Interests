import React from "react";
import { Route, Switch } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import HomePage from "./components/HomePage";
import GamePage from "./components/Game/GamePage";
import MoviePage from "./components/Movie/MoviePage";
import ShowPage from "./components/Show/ShowPage";
import SeasonPage from "./components/Show/SeasonPage";
import SearchPage from "./components/Search/SearchPage";
import LoginForm from "./components/Modals/LoginForm";
import RegistrationForm from "./components/Modals/RegistrationForm";
import ResetPasswordForm from "./components/Modals/ResetPasswordForm";
import ConfirmPage from "./components/ConfirmPage";
import ConfirmPasswordPage from "./components/ConfirmPasswordPage";
import UserPage from "./components/UserPage/UserPage";
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
            <Route exact path="/show/:id" component={ShowPage} />
            <Route exact path="/show/:show_id/season/:number" component={SeasonPage} />
            <Route exact path="/search/:query" component={SearchPage} />
            <Route exact path="/confirm/" component={ConfirmPage} />
            <Route exact path="/confirm_password/" component={ConfirmPasswordPage} />
            <Route exact path="/user/:userID" component={UserPage} />
            <Route render={function () { return <h1>Not Found</h1>; }} />
            
        </Switch>
      <ToastContainer position="top-center" hideProgressBar newestOnTop closeOnClick/>
      <LoginForm/>
      <RegistrationForm/>
      <ResetPasswordForm/>
      </div>
    );
  }
}
// 
export default Routes;