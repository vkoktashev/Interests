import React, {useState, useEffect, useMemo, useCallback} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import "./settings-page.scss";
import {Loader} from '@steroidsjs/core/ui/layout';

function SettingsPage(props) {
	const user = useSelector(getUser);
	const {http} = useComponents();
	const dispatch = useDispatch();

	const [gameNotifInput, setGameNotifInput] = useState(false);
	const [movieNotifInput, setMovieNotifInput] = useState(false);
	const [showNotifInput, setShowNotifInput] = useState(false);
	const [privacySelect, setPrivacySelect] = useState("Все");

	const settingsFetchConfig = useMemo(() => ({
		url: '/api/users/user/user_settings/',
		method: 'get',
	}), []);
	const {data: settings, isLoading} = useFetch(settingsFetchConfig);

	const patchSettings = useCallback(async (newSettings) => {
		http.send('PATCH', '/api/users/user/user_settings/', newSettings)
			.then(() => {
				dispatch(showNotification('Настройки сохранены!'));
			})
			.catch(() => {
				dispatch(showNotification('Ошибка сохранения!', 'danger'));
			});
	}, []);

	useEffect(
		() => {
			if (settings?.receive_games_releases) setGameNotifInput(settings.receive_games_releases);
			if (settings?.receive_movies_releases) setMovieNotifInput(settings.receive_movies_releases);
			if (settings?.receive_episodes_releases) setShowNotifInput(settings.receive_episodes_releases);
			if (settings?.privacy) setPrivacySelect(settings.privacy);
		},
		// eslint-disable-next-line
		[settings]
	);

	if (isLoading || !settings) {
		return <Loader />;
	}

	return (
		<div className='settings-page'>
			<div className='settings-page__body'>
				<h1 className='settings-page__header'>Настройки</h1>

				<LoadingOverlay
					active={isLoading}
					spinner
					text='Загрузка...'
				>
					<div>
						<h3 className='settings-page__subheader'>
							Подписка на почтовые уведомления:
						</h3>
						<div
							className='settings-page__settings-row'
							onClick={() => setGameNotifInput(!gameNotifInput)}
						>
							<input
								type='checkbox'
								className='settings-page__settings-checkbox'
								checked={gameNotifInput}
								onChange={(event) => setGameNotifInput(event.target.checked)}
							/>
							{" релиз новых игр"}
						</div>
						<div
							className='settings-page__settings-row'
							onClick={() => setMovieNotifInput(!movieNotifInput)}
						>
							<input
								type='checkbox'
								className='settings-page__settings-checkbox'
								checked={movieNotifInput}
								onChange={(event) => setMovieNotifInput(event.target.checked)}
							/>
							{" релиз новых фильмов"}
						</div>
						<div
							className='settings-page__settings-row'
							onClick={() => setShowNotifInput(!showNotifInput)}
						>
							<input
								type='checkbox'
								className='settings-page__settings-checkbox'
								checked={showNotifInput}
								onChange={(event) => setShowNotifInput(event.target.checked)}
							/>
							{" релиз новых серий сериалов"}
						</div>
					</div>
					<br />
					<div>
						<div className='settings-page__settings-row'>
							<label htmlFor='privacySelect'>Кто может видеть мой профиль:</label>
							<select
								id='privacySelect'
								name='privacySelect'
								className='settings-page__settings-select'
								onChange={(event) => {
									setPrivacySelect(event.target.value);
								}}
								value={privacySelect}>
								<option value='Все'>Все</option>
								<option value='Никто'>Никто</option>
								<option value='Друзья'>Мои подписки</option>
							</select>
						</div>
						<div className='settings-page__settings-row' hidden={!(settings.privacy !== privacySelect && privacySelect === "Никто")}>
							Внимание! Полное закрытие профиля удалит вас из подписок других пользователей!
						</div>
					</div>

					<button
						className='settings-page__save-button'
						disabled={!user}
						onClick={() => {
							patchSettings({
								eceive_games_releases: gameNotifInput,
								receive_movies_releases: movieNotifInput,
								receive_episodes_releases: showNotifInput,
								privacy: privacySelect
							});
						}}>
						Сохранить
					</button>
				</LoadingOverlay>
				<p>Ваша почта {user.email}</p>
			</div>
		</div>
	);
}

export default SettingsPage;
