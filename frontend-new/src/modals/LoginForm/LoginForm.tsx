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

	const onSubmit = async (values: any) => {
		setError('');
		setLoading(true);
		http.post('/users/auth/login/', values).then(response => {
			dispatch(login(response.access, false, {
				refreshToken: response.refresh,
			}));
			props.onClose();
		}).catch(e => {
			const errorMessage = e.response?.data?.detail || __('Внутренняя ошибка сервера');
			setError(errorMessage);
		}).finally(() => setLoading(false));
	};

	const onPasswordRecovery = async () => {
		dispatch(openModal(ResetPasswordForm));
		props.onClose();
	}

	const onRegistration = useCallback(() => {
		dispatch(openModal(RegisterForm));
		props.onClose();
	}, []);

	return (
		<Modal
			{...props}
			size='md'
			title={__('Войти')}
			className={bem.block()}
			onClose={props.onClose}
		>
			<Form onSubmit={onSubmit} className={bem.element('form')}>
				<p
					className='login-form__fail'
					hidden={!error}
				>
					{error}
				</p>

				<InputField
					attribute='username'
					label={__('Логин')}
					className={bem.element('input')}
				/>

				<PasswordField
					attribute='password'
					label={__('Пароль')}
					className={bem.element('input')}
				/>

				<Button
					type='submit'
					className='login-form__auth-button'
					label={isLoading ? __('Загрузка...') : __('Войти')}
				/>
				<Link onClick={onPasswordRecovery}>
					Восстановить пароль
				</Link>
				<Link onClick={onRegistration}>
					Зарегистрироваться
				</Link>
			</Form>
		</Modal>
	);
}

export default LoginForm;
