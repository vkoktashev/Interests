import React, { useState, useEffect } from "react";

import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";

import LoadingOverlay from "react-loading-overlay";
import "./style.css";

function SettingsPage({ loggedIn, settings, getUserSettings, saveSettings, settingsIsLoading, user }) {
	const [gameNotifInput, setGameNotifInput] = useState(false);
	const [movieNotifInput, setMovieNotifInput] = useState(false);
	const [showNotifInput, setShowNotifInput] = useState(false);

	useEffect(
		() => {
			getUserSettings();
		},
		// eslint-disable-next-line
		[loggedIn]
	);

	useEffect(
		() => {
			if (settings.receive_games_releases) setGameNotifInput(settings.receive_games_releases);
			if (settings.receive_movies_releases) setMovieNotifInput(settings.receive_movies_releases);
			if (settings.receive_episodes_releases) setShowNotifInput(settings.receive_episodes_releases);
		},
		// eslint-disable-next-line
		[settings]
	);

	return (
		<div>
			<div className='bg searchBG' />
			<div className='settingsPage'>
				<div className='settingsBlock'>
					<h1 className='calendarHeader'>Настройки</h1>
					<h3>Подписка на почтовые уведомления:</h3>
					<LoadingOverlay active={settingsIsLoading} spinner text='Загрузка...'>
						<div className='settingsRow' onClick={() => setGameNotifInput(!gameNotifInput)}>
							<input type='checkbox' className='settingsCheckbox' id='gameNotificationsInput' checked={gameNotifInput} onChange={(event) => setGameNotifInput(event.target.checked)} />{" "}
							релиз новых игр
						</div>
						<div className='settingsRow' onClick={() => setMovieNotifInput(!movieNotifInput)}>
							<input type='checkbox' className='settingsCheckbox' id='movieNotificationsInput' checked={movieNotifInput} onChange={(event) => setMovieNotifInput(event.target.checked)} />{" "}
							релиз новых фильмов
						</div>
						<div className='settingsRow' onClick={() => setShowNotifInput(!showNotifInput)}>
							<input type='checkbox' className='settingsCheckbox' id='episodeNotificationsInput' checked={showNotifInput} onChange={(event) => setShowNotifInput(event.target.checked)} />{" "}
							релиз новых серий сериалов
						</div>
						<button
							className='saveSettingsButton'
							disabled={!loggedIn}
							onClick={() => {
								saveSettings({ receive_games_releases: gameNotifInput, receive_movies_releases: movieNotifInput, receive_episodes_releases: showNotifInput });
							}}>
							Сохранить
						</button>
					</LoadingOverlay>
					<p>Ваша почта {user.email}</p>
				</div>
			</div>
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	user: selectors.getUser(state),
	settings: selectors.getUserSettings(state),
	settingsIsLoading: selectors.getIsLoadingUserSettings(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		getUserSettings: () => {
			dispatch(actions.requestUserSettings());
		},
		saveSettings: (settings) => {
			dispatch(actions.patchUserSettings(settings));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPage);
