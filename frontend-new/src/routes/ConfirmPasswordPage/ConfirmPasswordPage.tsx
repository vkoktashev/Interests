import React, {useCallback, useMemo, useState} from 'react';
import {Button, Form, PasswordField} from '@steroidsjs/core/ui/form';
import {useBem, useComponents, useSelector} from '@steroidsjs/core/hooks';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import './confirm-password-page.scss';
import {ROUTE_ROOT} from '../index';

const formId = 'ConfirmPasswordForm';
function ConfirmPasswordPage() {
	const bem = useBem('confirm-password-page');
	const {http} = useComponents();
	const formValues = useSelector(state => getFormValues(state, formId));
	const [state, setState] = useState('');

	const params = useMemo(() => new URLSearchParams(window.location.search), []);
	const token = params.get("token");
	const hasToken = !!token;
	const isDone = state === 'done';
	const isError = state.startsWith('error:');
	const errorText = isError ? state.replace(/^error:\s*/, '') : '';
	const passwordsMismatch = !!formValues?.passwordConfirm?.length && formValues?.password !== formValues?.passwordConfirm;
	const passwordTooShort = !!formValues?.password?.length && formValues?.password?.length < 6;
	const isSubmitDisabled = !hasToken
		|| isDone
		|| passwordTooShort
		|| passwordsMismatch
		|| !formValues?.password?.length;

	const onSubmit = useCallback((values) => {
		if (!token) {
			setState(`error: ${__('Некорректная ссылка для сброса пароля')}`);
			return;
		}

		http
			.send('PATCH', `/users/auth/confirm_password_reset/?reset_token=${token}`, values)
			.then(() => setState('done'))
			.catch(e => {
				setState(`error: ${Object.values(e?.response?.data).flat().flat().join('\n')}`);
			});
	}, [http, token]);

	return (
		<div className={bem.block()}>
			<div className={bem.element('body')}>
				<Form
					formId={formId}
					onSubmit={onSubmit}
					useRedux
					className={bem.element('form')}
				>
					<div className={bem.element('intro')}>
						<div className={bem.element('intro-title')}>{__('Обновить пароль')}</div>
						<div className={bem.element('intro-text')}>
							{__('Задайте новый пароль для аккаунта. После сохранения можно будет войти с ним в приложение.')}
						</div>
					</div>

					{!hasToken && (
						<p className={bem.element('fail')}>
							{__('Некорректная ссылка для сброса пароля')}
						</p>
					)}

					{isError && (
						<p className={bem.element('fail')}>
							{errorText}
						</p>
					)}

					{isDone && (
						<div className={bem.element('success-card')}>
							<div className={bem.element('success-title')}>{__('Пароль обновлён')}</div>
							<div className={bem.element('success-text')}>
								{__('Теперь вы можете войти в аккаунт с новым паролем.')}
							</div>
							<div className={bem.element('actions')}>
								<Button
									tag='a'
									toRoute={ROUTE_ROOT}
									className={bem.element('secondary-button')}
									label={__('На главную')}
								/>
							</div>
						</div>
					)}

					{!isDone && (
						<>
							<div className={bem.element('fields')}>
								<PasswordField
									attribute='password'
									label={__('Новый пароль')}
									className={bem.element('input')}
									showSecurityBar
									inputProps={{autoComplete: 'new-password'}}
								/>
								<div className={bem.element('hint', {warn: passwordTooShort})}>
									{__('Минимум 6 символов. Лучше использовать буквы разного регистра и цифры.')}
								</div>

								<PasswordField
									attribute='passwordConfirm'
									label={__('Подтверждение пароля')}
									className={bem.element('input')}
									inputProps={{autoComplete: 'new-password'}}
									errors={[passwordsMismatch && __('Пароли не совпадают')].filter(Boolean)}
								/>
								<div className={bem.element('hint', {error: passwordsMismatch, ok: !!formValues?.passwordConfirm && !passwordsMismatch})}>
									{passwordsMismatch
										? __('Пароли не совпадают')
										: (formValues?.passwordConfirm ? __('Пароли совпадают') : __('Повторите пароль для проверки'))}
								</div>
							</div>

							<div className={bem.element('footer')}>
								<div className={bem.element('actions')}>
									<Button
										type='submit'
										className={bem.element('button')}
										disabled={isSubmitDisabled}
										label={__('Обновить пароль')}
									/>
								</div>
							</div>
						</>
					)}
				</Form>
			</div>
		</div>
	);
}

export default ConfirmPasswordPage;
