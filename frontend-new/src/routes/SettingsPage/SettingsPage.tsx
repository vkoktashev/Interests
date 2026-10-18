import SaveDock from '../../shared/SaveDock';
import {formSubmit} from '@steroidsjs/core/actions/form';
import {isEqual} from 'lodash-es';
import useSavedValues from 'hooks/useSavedValues';
import useUnsavedChanges from 'hooks/useUnsavedChanges';
import React, {useState, useMemo, useCallback, useEffect, useRef} from 'react';
import LoadingOverlay from "react-loading-overlay";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {openModal} from '@steroidsjs/core/actions/modal';
import "./settings-page.scss";
import {Loader} from '@steroidsjs/core/ui/layout';
import {Button, CheckboxField, DropDownField, Form, RadioListField} from '@steroidsjs/core/ui/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import GoogleSignInButton from '../../shared/auth/GoogleSignInButton';
import LoginForm from '../../modals/LoginForm';
import {savedNotification} from '../../shared/saveNotifications';

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

const genderItems = [
	{
		id: 'male',
		label: 'Мужской',
	},
	{
		id: 'female',
		label: 'Женский',
	},
];

const steamRegionItems = [
	{
		id: 'Россия',
		label: 'Россия',
	},
	{
		id: 'Казахстан',
		label: 'Казахстан',
	},
];

const SETTINGS_FORM_ID = 'settings_form_id';

function SettingsPage() {
	const bem = useBem('settings-page');
	const user = useSelector(getUser);
	const isAuthorized = Boolean(user?.id);
	const formValues = useSelector(state => getFormValues(state, SETTINGS_FORM_ID));
	const {http} = useComponents();
	const dispatch = useDispatch();

	const settingsFetchConfig = useMemo(() => isAuthorized ? ({
		url: '/users/user/user_settings/',
		method: 'get',
	}) : null, [isAuthorized]);
	const {data: settings, isLoading} = useFetch(settingsFetchConfig);
	const googleLinkStatusFetchConfig = useMemo(() => isAuthorized ? ({
		url: '/users/auth/google_link_status/',
		method: 'get',
	}) : null, [isAuthorized]);
	const {
		data: googleLinkStatus,
		fetch: fetchGoogleLinkStatus,
		isLoading: isGoogleLinkStatusLoading,
	} = useFetch(googleLinkStatusFetchConfig);
	const [isGoogleActionLoading, setGoogleActionLoading] = useState(false);
	const email = settings?.email || user?.email;

	const {savedValues, markSaved} = useSavedValues(settings, String(user?.id));
	const hasChanges = isAuthorized && !!formValues && !!savedValues && !isEqual(formValues, savedValues);
	const [isSaving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const savingRef = useRef(false);
	useUnsavedChanges(hasChanges || isSaving);
	useEffect(() => {
		if (!hasChanges) setSaveError('');
	}, [hasChanges]);

	const patchSettings = useCallback(async (values) => {
		if (savingRef.current) {
			return;
		}
		savingRef.current = true;
		setSaving(true);
		setSaveError('');
		const submittedValues = {...values};
		try {
			await http.send('PATCH', '/users/user/user_settings/', submittedValues);
			markSaved(submittedValues);
			dispatch(savedNotification());
		} catch {
			setSaveError('Не удалось сохранить настройки. Попробуйте ещё раз.');
		} finally {
			savingRef.current = false;
			setSaving(false);
		}
	}, [http, dispatch, markSaved]);

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

	if (!isAuthorized) {
		return (
			<div className={bem.block()}>
				<div className={bem.element('body')}>
					<div className={bem.element('hero')}>
						<div>
							<h1 className={bem.element('header')}>
								Настройки
							</h1>
							<p className={bem.element('subtitle')}>
								Войдите в аккаунт, чтобы управлять уведомлениями, приватностью и связанными аккаунтами.
							</p>
						</div>
					</div>
					<div className={bem.element('actions')}>
						<Button
							className={bem.element('save-button')}
							label={__('Войти')}
							onClick={() => dispatch(openModal(LoginForm))}
						/>
					</div>
				</div>
			</div>
		);
	}

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
						autoDestroy
					>
						<fieldset className={bem.element('fields')} disabled={isSaving}>
							<div className={bem.element('grid')}>
								<section className={bem.element('card')}>
									<h3 className={bem.element('subheader')}>
										Профиль
									</h3>
									<RadioListField
										attribute='gender'
										items={genderItems}
										label={__('Пол')}
										fieldLayoutClassName={bem.element('dropdown')}
									/>
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
											attribute="receive_movies_digital_releases"
											label={__('цифровой релиз фильмов')}
										/>
										<CheckboxField
											attribute="receive_episodes_releases"
											label={__('релиз новых серий сериалов')}
										/>
										<CheckboxField
											attribute="receive_people_releases"
											label={__('релизы работ отслеживаемых людей')}
										/>
										<CheckboxField
											attribute="receive_show_status_changes"
											label={__('изменения статуса сериалов')}
										/>
									</div>
								</section>
								<section className={bem.element('card')}>
									<h3 className={bem.element('subheader')}>
										Изображения
									</h3>
									<div className={bem.element('option-list')}>
										<CheckboxField
											attribute="use_image_proxy"
											label={__('Прокси для картинок с TMDB')}
										/>
									</div>
								</section>
								<section className={bem.element('card')}>
									<h3 className={bem.element('subheader')}>
										Steam
									</h3>
									<p className={bem.element('section-text')}>
										Регион нужен, чтобы показывать цену Steam для вашего аккаунта.
									</p>
									<DropDownField
										attribute='steam_account_region'
										items={steamRegionItems}
										label={__('Регион Steam аккаунта')}
										fieldLayoutClassName={bem.element('dropdown')}
									/>
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
						</fieldset>
					</Form>
				</LoadingOverlay>
				<div className={bem.element('footer')}>
					<p className={bem.element('email')}>
						Ваша почта: {email}
					</p>
				</div>
			</div>
			<SaveDock
				visible={hasChanges || isSaving}
				isSaving={isSaving}
				error={saveError}
				onSave={() => dispatch(formSubmit(SETTINGS_FORM_ID))}
			/>
		</div>
	);
}

export default SettingsPage;
