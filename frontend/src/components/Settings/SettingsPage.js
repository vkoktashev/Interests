import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import CurrentUserStore from "../../store/CurrentUserStore";
import { toast } from "react-toastify";

import LoadingOverlay from "react-loading-overlay";
import "./style.css";
import SettingsCheckbox from "./SettingsCheckbox";

const SettingsPage = observer((props) => {
	const { loggedIn, user } = AuthStore;
	const { settings, requestSettings, patchSettings, settingsState, saveSettingsState } = CurrentUserStore;

	const [gameNotifInput, setGameNotifInput] = useState(false);
	const [movieNotifInput, setMovieNotifInput] = useState(false);
	const [showNotifInput, setShowNotifInput] = useState(false);

	useEffect(
		() => {
			if (loggedIn) requestSettings();
		},
		// eslint-disable-next-line
		[loggedIn]
	);

	useEffect(() => {
		if (saveSettingsState === "saved") toast.success("Настройки сохранены!");
		if (saveSettingsState.startsWith("error:")) toast.error(`Ошибка сохранения! ${saveSettingsState}`);
	}, [saveSettingsState]);
	useEffect(() => {
		if (settingsState.startsWith("error:")) toast.error(`Ошибка загрузки! ${settingsState}`);
	}, [settingsState]);

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
					<LoadingOverlay active={settingsState === "pending" || saveSettingsState === "pending"} spinner text='Загрузка...'>
						<SettingsCheckbox text={" релиз новых игр"} checked={gameNotifInput} onChange={(checked) => setGameNotifInput(checked)} />
						<SettingsCheckbox text={" релиз новых фильмов"} checked={movieNotifInput} onChange={(checked) => setMovieNotifInput(checked)} />
						<SettingsCheckbox text={" релиз новых серий сериалов"} checked={showNotifInput} onChange={(checked) => setShowNotifInput(checked)} />
						<button
							className='saveSettingsButton'
							disabled={!loggedIn}
							onClick={() => {
								patchSettings({ receive_games_releases: gameNotifInput, receive_movies_releases: movieNotifInput, receive_episodes_releases: showNotifInput });
							}}>
							Сохранить
						</button>
					</LoadingOverlay>
					<p>Ваша почта {user.email}</p>
				</div>
			</div>
		</div>
	);
});

export default SettingsPage;
