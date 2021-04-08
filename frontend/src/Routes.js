import React from "react";
import { Route, Switch } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

import HomePage from "./components/HomePage";
import GamePage from "./components/Game/GamePage";
import MoviePage from "./components/Movie/MoviePage";
import ShowPage from "./components/Show/ShowPage";
import SeasonPage from "./components/Show/SeasonPage";
import EpisodePage from "./components/Show/EpisodePage";
import SearchPage from "./components/Search/SearchPage";
import ConfirmPage from "./components/ConfirmPage";
import ConfirmPasswordPage from "./components/ConfirmPasswordPage";
import UserPage from "./components/UserPage/UserPage";
import CalendarPage from "./components/Calendar/CalendarPage";
import SettingsPage from "./components/Settings/SettingsPage";
import UnwatchedPage from "./components/Unwatched/UnwatchedPage";
import NotFoundPage from "./components/NotFoundPage";

class Routes extends React.Component {
	render() {
		return (
			<Switch>
				<Route exact path='/' component={HomePage} />
				<Route exact path='/game/:id' component={GamePage} />
				<Route exact path='/movie/:id' component={MoviePage} />
				<Route exact path='/show/:id' component={ShowPage} />
				<Route exact path='/show/:show_id/season/:number' component={SeasonPage} />
				<Route exact path='/show/:show_id/season/:season_number/episode/:episode_number' component={EpisodePage} />
				<Route exact path='/search/:query' component={SearchPage} />
				<Route exact path='/confirm/' component={ConfirmPage} />
				<Route exact path='/confirm_password/' component={ConfirmPasswordPage} />
				<Route exact path='/user/:userID' component={UserPage} />
				<Route exact path='/user/:userID/:category' component={UserPage} />
				<Route exact path='/calendar' component={CalendarPage} />
				<Route exact path='/settings' component={SettingsPage} />
				<Route exact path='/unwatched' component={UnwatchedPage} />
				<Route component={NotFoundPage} />
			</Switch>
		);
	}
}
//
export default Routes;
