import React, {useState, useEffect, useMemo, useCallback} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import "./settings-page.scss";
import {Loader} from '@steroidsjs/core/ui/layout';
import {Button, CheckboxField, DropDownField, Form} from '@steroidsjs/core/ui/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';

const privacyItems = [
	{
		id: 'Все',
		label: 'Все',
	},
	{
		id: 'Никто',
		label: 'Никто',
	},
	{
		id: 'Друзья',
		label: 'Мои подписки',
	},
];

const SETTINGS_FORM_ID = 'settings_form_id';

function SettingsPage() {
	const bem = useBem('settings-page');
	const user = useSelector(getUser);
	const formValues = useSelector(state => getFormValues(state, SETTINGS_FORM_ID));
	const {http} = useComponents();
	const dispatch = useDispatch();

	const settingsFetchConfig = useMemo(() => ({
		url: '/api/users/user/user_settings/',
		method: 'get',
	}), []);
	const {data: settings, isLoading} = useFetch(settingsFetchConfig);

	const patchSettings = useCallback(async (values) => {
		http.send('PATCH', '/api/users/user/user_settings/', values)
			.then(() => {
				dispatch(showNotification('Настройки сохранены!'));
			})
			.catch(() => {
				dispatch(showNotification('Ошибка сохранения!', 'danger'));
			});
	}, []);

	if (isLoading || !settings) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div className={bem.element('body')}>
				<h1 className={bem.element('header')}>
					Настройки
				</h1>

				<LoadingOverlay
					active={isLoading}
					spinner
					text='Загрузка...'
				>
					<Form
						formId={SETTINGS_FORM_ID}
						initialValues={settings}
						onSubmit={patchSettings}
						useRedux
					>
						<h3 className={bem.element('subheader')}>
							Подписка на почтовые уведомления:
						</h3>
						<CheckboxField
							attribute="receive_games_releases"
							label={__('релиз новых игр')}
						/>
						<CheckboxField
							attribute="receive_movies_releases"
							label={__('релиз новых фильмов')}
						/>
						<CheckboxField
							attribute="receive_episodes_releases"
							label={__('релиз новых серий сериалов')}
						/>
						<DropDownField
							attribute='privacy'
							items={privacyItems}
							label={__('Кто может видеть мой профиль')}
							className={bem.element('dropdown')}
						/>
						{
							settings?.privacy !== formValues?.privacy && formValues?.privacy === 'Никто' && (
								<div className={bem.element('settings-row')}>
									{__('Внимание! Полное закрытие профиля удалит вас из подписок других пользователей!')}
								</div>
							)
						}
						<Button
							className={bem.element('save-button')}
							disabled={!user}
							label={__('Сохранить')}
							type="submit"
						/>
					</Form>
				</LoadingOverlay>
				<p className={bem.element('email')}>
					Ваша почта {user.email}
				</p>
			</div>
		</div>
	);
}

export default SettingsPage;
