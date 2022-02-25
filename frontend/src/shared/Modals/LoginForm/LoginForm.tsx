import React, {useEffect, useState} from 'react';
import { observer } from 'mobx-react';

import AuthStore from '../../../store/AuthStore';
import PagesStore from '../../../store/PagesStore';
import Modal from '../../Modal';

import './login-form.sass';

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const LoginForm = observer(() => {
	const { tryAuth, authState } = AuthStore;
	const { LoginFormIsOpen, closeLoginForm, openResetPasswordForm, openRegistrateForm } = PagesStore;

	const [password, setPassword] = useState('');
	const [login, setLogin] = useState('');

	useEffect(() => {
		if (authState === "done"){
			closeLoginForm();
		}
	}, [authState, closeLoginForm]);

	const onSubmit = async (event: any) => {
		event.preventDefault();
		await tryAuth(login, password);
	};

	const onPasswordRecovery = async () => {
		await closeLoginForm();
		await openResetPasswordForm();
	}

	const onRegistration = async () => {
		await closeLoginForm();
		await openRegistrateForm();
	}

	return (
		<Modal isOpen={LoginFormIsOpen} toggle={closeLoginForm} className='login-form'>
			<form onSubmit={onSubmit}>
				<h2 className='login-form__header'>
					Войти
				</h2>
				<p
					className='login-form__fail'
					hidden={!authState.startsWith("error:")}
				>
					{authState}
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
					value={login}
					onChange={(e) => setLogin(e.target.value)}
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
						{authState !== "pending" ? "Войти" : "Загрузка..."}
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
});

export default LoginForm;
