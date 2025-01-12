import React, {useCallback, useState} from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import { IModalProps } from '@steroidsjs/core/ui/modal/Modal/Modal';
import {useBem, useComponents, useDispatch} from '@steroidsjs/core/hooks';
import './login-form.scss';
import {openModal} from '@steroidsjs/core/actions/modal';
import RegisterForm from '../RegisterForm';
import ResetPasswordForm from '../ResetPasswordForm';
import {login} from '@steroidsjs/core/actions/auth';

export function LoginForm(props: IModalProps) {
	const bem = useBem('login-form');
	const dispatch = useDispatch();
	const {http} = useComponents();
	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState('');

	const onSubmit = async (event: any) => {
		event.preventDefault();
		setError('');
		setLoading(true);
		http.post('/users/auth/login/', {
			username: username,
			password: password,
		}).then(response => {
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
			<form onSubmit={onSubmit}>
				<p
					className='login-form__fail'
					hidden={!error}
				>
					{error}
				</p>

				<label
					htmlFor='loginInput'
					className='grey-text'
				>
					Логин
				</label>
				<input
					type='text'
					id='loginInput'
					className='login-form__input'
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>

				<label
					htmlFor='passwordInput'
					className='grey-text'
				>
					Пароль
				</label>
				<input
					type='password'
					id='passwordInput'
					className='login-form__input'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<div className='text-center mt-4'>
					<button
						type='submit'
						className='login-form__auth-button'
					>
						{isLoading ? __('Загрузка...') : __('Войти')}
					</button>
					<label
						className='login-form__link-label'
						onClick={onPasswordRecovery}>
						Восстановить пароль
					</label>
					<label
						className='login-form__link-label'
						onClick={onRegistration}>
						Зарегистрироваться
					</label>
				</div>
			</form>
		</Modal>
	);
}

export default LoginForm;
