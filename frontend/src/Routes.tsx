import React from 'react';
import { Route, Switch } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';

import HomePage from './routes/HomePage';
import GamePage from './routes/GamePage';
import MoviePage from './routes/MoviePage';
import ShowPage from './routes/ShowPage';
import SeasonPage from './routes/ShowSeasonPage';
import EpisodePage from './routes/ShowEpisodePage';
import SearchPage from './routes/SearchPage';
import ConfirmPage from './routes/ConfirmPage';
import ConfirmPasswordPage from './routes/ConfirmPasswordPage';
import UserPage from './routes/UserPage';
import CalendarPage from './routes/CalendarPage';
import SettingsPage from './routes/SettingsPage';
import UnwatchedPage from './routes/UnwatchedPage';
import NotFoundPage from './routes/NotFoundPage';

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
