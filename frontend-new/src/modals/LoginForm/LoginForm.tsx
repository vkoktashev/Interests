import React, {useCallback, useState} from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import { IModalProps } from '@steroidsjs/core/ui/modal/Modal/Modal';
import {useBem, useComponents, useDispatch} from '@steroidsjs/core/hooks';
import './login-form.scss';
import {openModal} from '@steroidsjs/core/actions/modal';
import RegisterForm from '../RegisterForm';
import ResetPasswordForm from '../ResetPasswordForm';
import {login} from '@steroidsjs/core/actions/auth';
import {Button, Form, InputField, PasswordField} from '@steroidsjs/core/ui/form';
import {Link} from '@steroidsjs/core/ui/nav';

export function LoginForm(props: IModalProps) {
	const bem = useBem('login-form');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const onSubmit = useCallback(async (values: Record<string, string>) => {
		setError('');
		setLoading(true);

		try {
			const response = await http.post('/users/auth/login/', values);
			dispatch(login(response.access, false, {
				refreshToken: response.refresh,
			}));
			props.onClose();
		} catch (e) {
			const errorMessage = e.response?.data?.detail || __('Внутренняя ошибка сервера');
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [dispatch, http, props]);

	const onPasswordRecovery = useCallback(() => {
		dispatch(openModal(ResetPasswordForm));
		props.onClose();
	}, [dispatch, props]);

	const onRegistration = useCallback(() => {
		dispatch(openModal(RegisterForm));
		props.onClose();
	}, [dispatch, props]);

	return (
		<Modal
			{...props}
			size='sm'
			title={__('Войти')}
			className={bem.block()}
			onClose={props.onClose}
		>
			<Form onSubmit={onSubmit} className={bem.element('form')}>
				<div className={bem.element('intro')}>
					<div className={bem.element('intro-title')}>{__('С возвращением')}</div>
					<div className={bem.element('intro-text')}>
						{__('Войдите в аккаунт, чтобы продолжить отмечать просмотренное, ставить оценки и смотреть статистику.')}
					</div>
				</div>

				{!!error && (
					<p className={bem.element('fail')}>
						{error}
					</p>
				)}

				<div className={bem.element('fields')}>
					<InputField
						attribute='username'
						label={__('Логин')}
						className={bem.element('input')}
						placeholder={__('Ваш никнейм или email')}
						inputProps={{autoComplete: 'username'}}
					/>

					<PasswordField
						attribute='password'
						label={__('Пароль')}
						className={bem.element('input')}
						inputProps={{autoComplete: 'current-password'}}
					/>
				</div>

				<div className={bem.element('footer')}>
					<div className={bem.element('actions')}>
						<Button
							type='submit'
							className={bem.element('auth-button')}
							label={isLoading ? __('Входим...') : __('Войти')}
							disabled={isLoading}
						/>
					</div>

					<Link onClick={onPasswordRecovery} className={bem.element('link-muted')}>
						{__('Забыли пароль?')}
					</Link>

					<div className={bem.element('signup')}>
						<p className={bem.element('signup-text')}>
							{__('Нет аккаунта?')}
						</p>
						<Link onClick={onRegistration} className={bem.element('link-primary')}>
							{__('Создать аккаунт')}
						</Link>
					</div>
				</div>
			</Form>
		</Modal>
	);
}

export default LoginForm;
