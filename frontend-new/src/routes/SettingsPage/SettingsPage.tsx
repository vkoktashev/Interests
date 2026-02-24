import React, {useState, useEffect, useMemo, useCallback} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import "./settings-page.scss";
import {Loader} from '@steroidsjs/core/ui/layout';
import {Button, CheckboxField, DropDownField, Form} from '@steroidsjs/core/ui/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import GoogleSignInButton from '../../shared/auth/GoogleSignInButton/GoogleSignInButton';

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
		url: '/users/user/user_settings/',
		method: 'get',
	}), []);
	const {data: settings, isLoading} = useFetch(settingsFetchConfig);
	const googleLinkStatusFetchConfig = useMemo(() => ({
		url: '/users/auth/google_link_status/',
		method: 'get',
	}), []);
	const {
		data: googleLinkStatus,
		fetch: fetchGoogleLinkStatus,
		isLoading: isGoogleLinkStatusLoading,
	} = useFetch(googleLinkStatusFetchConfig);
	const [isGoogleActionLoading, setGoogleActionLoading] = useState(false);

	const patchSettings = useCallback(async (values) => {
		http.send('PATCH', '/users/user/user_settings/', values)
			.then(() => {
				dispatch(showNotification('Настройки сохранены!'));
			})
			.catch(() => {
				dispatch(showNotification('Ошибка сохранения!', 'danger'));
			});
	}, []);

	const onGoogleLink = useCallback(async (credential: string) => {
		setGoogleActionLoading(true);
		try {
			await http.post('/users/auth/google_link/', {credential});
			await fetchGoogleLinkStatus();
			dispatch(showNotification('Google аккаунт привязан!'));
		} catch (e) {
			const errorMessage = e?.response?.data?.error || 'Не удалось привязать Google аккаунт';
			dispatch(showNotification(errorMessage, 'danger'));
		} finally {
			setGoogleActionLoading(false);
		}
	}, [dispatch, fetchGoogleLinkStatus, http]);

	const onGoogleUnlink = useCallback(async () => {
		setGoogleActionLoading(true);
		try {
			await http.send('DELETE', '/users/auth/google_unlink/');
			await fetchGoogleLinkStatus();
			dispatch(showNotification('Google аккаунт отвязан.'));
		} catch (e) {
			const errorMessage = e?.response?.data?.error || 'Не удалось отвязать Google аккаунт';
			dispatch(showNotification(errorMessage, 'danger'));
		} finally {
			setGoogleActionLoading(false);
		}
	}, [dispatch, fetchGoogleLinkStatus, http]);

	if (isLoading || !settings) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div className={bem.element('body')}>
				<div className={bem.element('hero')}>
					<div>
						<h1 className={bem.element('header')}>
							Настройки
						</h1>
						<p className={bem.element('subtitle')}>
							Управляйте уведомлениями и приватностью профиля.
						</p>
					</div>
				</div>

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
						<div className={bem.element('grid')}>
							<section className={bem.element('card')}>
								<h3 className={bem.element('subheader')}>
									Подписка на почтовые уведомления
								</h3>
								<div className={bem.element('option-list')}>
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
								</div>
							</section>
							<section className={bem.element('card')}>
								<h3 className={bem.element('subheader')}>
									Приватность
								</h3>
								<DropDownField
									attribute='privacy'
									items={privacyItems}
									label={__('Кто может видеть мой профиль')}
									fieldLayoutClassName={bem.element('dropdown')}
								/>
								{
									settings?.privacy !== formValues?.privacy && formValues?.privacy === 'Никто' && (
										<div className={bem.element('warning')}>
											{__('Внимание! Полное закрытие профиля удалит вас из подписок других пользователей!')}
										</div>
									)
								}
							</section>
							<section className={bem.element('card')}>
								<h3 className={bem.element('subheader')}>
									Связанные аккаунты
								</h3>
								<div className={bem.element('integration-card', {linked: !!googleLinkStatus?.is_linked})}>
									<div className={bem.element('integration-header')}>
										<div>
											<div className={bem.element('integration-title')}>Google</div>
											<div className={bem.element('integration-subtitle')}>
												{googleLinkStatus?.is_linked
													? `Привязан: ${googleLinkStatus?.google_email || 'Google аккаунт'}`
													: 'Подключите Google, чтобы входить в аккаунт без пароля'}
											</div>
										</div>
										<div className={bem.element('integration-badge', {linked: !!googleLinkStatus?.is_linked})}>
											{googleLinkStatus?.is_linked ? 'Подключен' : 'Не подключен'}
										</div>
									</div>

									{!googleLinkStatus?.is_linked && (
										<GoogleSignInButton
											className={bem.element('google-link')}
											disabled={isGoogleActionLoading || isGoogleLinkStatusLoading}
											onCredential={onGoogleLink}
											onError={(message) => dispatch(showNotification(message, 'danger'))}
										/>
									)}

									{googleLinkStatus?.is_linked && (
										<div className={bem.element('integration-actions')}>
											<Button
												type='button'
												outline
												color='danger'
												className={bem.element('unlink-button')}
												disabled={isGoogleActionLoading}
												label={isGoogleActionLoading ? 'Отвязка...' : 'Отвязать Google'}
												onClick={onGoogleUnlink}
											/>
										</div>
									)}
								</div>
							</section>
						</div>
						<div className={bem.element('actions')}>
							<Button
								className={bem.element('save-button')}
								disabled={!user}
								label={__('Сохранить')}
								type="submit"
							/>
						</div>
					</Form>
				</LoadingOverlay>
				<div className={bem.element('footer')}>
					<p className={bem.element('email')}>
						Ваша почта {user.email}
					</p>
				</div>
			</div>
		</div>
	);
}

export default SettingsPage;
