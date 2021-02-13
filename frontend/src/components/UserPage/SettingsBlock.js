import React, { useState } from "react";
import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";
import LoadingOverlay from "react-loading-overlay";

function SettingsBlock({ loggedIn, saveSettings, settingsIsLoading }) {
	const [gameNotifInput, setGameNotifInput] = useState(false);
	const [movieNotifInput, setMovieNotifInput] = useState(false);
	const [showNotifInput, setShowNotifInput] = useState(false);

	return (
		<div className='settingsBlock'>
			<h3>Подписка на почтовые уведомления:</h3>
			<LoadingOverlay active={settingsIsLoading} spinner text='Загрузка...'>
				<div className='settingsRow'>
					<input type='checkbox' className='settingsCheckbox' id='gameNotificationsInput' checked={gameNotifInput} onChange={(event) => setGameNotifInput(event.target.checked)} /> релиз
					новых игр
				</div>
				<div className='settingsRow'>
					<input type='checkbox' className='settingsCheckbox' id='movieNotificationsInput' checked={movieNotifInput} onChange={(event) => setMovieNotifInput(event.target.checked)} /> релиз
					новых фильмов
				</div>
				<div className='settingsRow'>
					<input type='checkbox' className='settingsCheckbox' id='episodeNotificationsInput' checked={showNotifInput} onChange={(event) => setShowNotifInput(event.target.checked)} /> релиз
					новых серий сериалов
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
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	settingsIsLoading: selectors.getIsLoadingUserPageSettings(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		saveSettings: (settings) => {
			dispatch(actions.patchUserSettings(settings));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(SettingsBlock);
