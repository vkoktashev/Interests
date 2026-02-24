import React, {useCallback, useState} from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import './register-form.scss';
import {Button, EmailField, Form, InputField, PasswordField} from '@steroidsjs/core/ui/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';

const REGISTRATION_FORM = 'registration_form';

export function RegisterForm(props: IModalProps) {
    const bem = useBem('register-form');
	const {http} = useComponents();
	const dispatch = useDispatch();
    const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [isRegistrationSuccess, setRegistrationSuccess] = useState(false);
	const {username, email, password, passwordConfirm} = useSelector(state => getFormValues(state, REGISTRATION_FORM) || {});
	const passwordsMismatch = !!passwordConfirm?.length && password !== passwordConfirm;
	const passwordTooShort = !!password?.length && password.length < 6;
	const isInvalid = password !== passwordConfirm
		|| !username?.length
		|| !email?.length
		|| !password?.length
		|| passwordTooShort
		|| isRegistrationSuccess;

	const onRegistration = useCallback(async (values: Record<string, string>) => {
		setLoading(true);
		setError('');
		try {
			const response = await http.post('/users/auth/signup/', values);
			setRegistrationSuccess(true);
		} catch (error) {
			const data = error?.response?.data;
			const errorMessage = data?.error
				|| (data && Object.values(data).flat().flat().join('\n'))
				|| __('Ошибка сервера');
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
    }, [dispatch, http]);

	return (
		<Modal
            {...props}
            size='sm'
            className={bem.block()}
            onClose={props.onClose}
			title={__('Регистрация')}
		>
			<Form
				formId={REGISTRATION_FORM}
				onSubmit={onRegistration}
				className={bem.element('form')}
				useRedux
			>
				<div className={bem.element('intro')}>
					<div className={bem.element('intro-title')}>{__('Создайте аккаунт')}</div>
					<div className={bem.element('intro-text')}>
						{__('Сохраняйте игры, фильмы и сериалы, ставьте оценки и собирайте статистику в одном профиле.')}
					</div>
				</div>

				{!!error && (
					<p className={bem.element('fail')}>
						{error}
					</p>
				)}

				{isRegistrationSuccess && (
					<div className={bem.element('success-card')}>
						<div className={bem.element('success-title')}>
							{__('Аккаунт создан')}
						</div>
						<div className={bem.element('success-text')}>
							<strong>{username}</strong>, {__('добро пожаловать! Осталось подтвердить электронную почту по письму, которое мы отправили.')}
						</div>
						<div className={bem.element('actions')}>
							<Button
								type='button'
								className={bem.element('secondary-button')}
								label={__('Закрыть')}
								onClick={props.onClose}
							/>
						</div>
					</div>
				)}

				{!isRegistrationSuccess && (
					<div className={bem.element('fields')}>
						<InputField
							attribute='username'
							label={__('Никнейм')}
							placeholder={__('Например, cinefox')}
							className={bem.element('input')}
							inputProps={{autoComplete: 'username'}}
						/>
						<EmailField
							attribute='email'
							label={__('Электронная почта')}
							placeholder='name@example.com'
							className={bem.element('input')}
							inputProps={{autoComplete: 'email'}}
						/>
						<PasswordField
							attribute='password'
							label={__('Пароль')}
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
						<div className={bem.element('hint', {error: passwordsMismatch, ok: !!passwordConfirm && !passwordsMismatch})}>
							{passwordsMismatch
								? __('Пароли не совпадают')
								: (passwordConfirm ? __('Пароли совпадают') : __('Повторите пароль для проверки'))}
						</div>
					</div>
				)}

				{!isRegistrationSuccess && (
					<div className={bem.element('footer')}>
						<div className={bem.element('actions')}>
							<Button
								type='submit'
								className={bem.element('auth-button')}
								disabled={isInvalid || isLoading}
								label={isLoading ? __('Создаём аккаунт...') : __('Зарегистрироваться')}
							/>
						</div>
					</div>
				)}
			</Form>
		</Modal>
	);
}
