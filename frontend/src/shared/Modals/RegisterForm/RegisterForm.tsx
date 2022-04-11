import React, {useState} from 'react';
import { observer } from 'mobx-react';
import classnames from 'classnames';

import AuthStore from '../../../store/AuthStore';
import PagesStore from '../../../store/PagesStore';
import Modal from '../../Modal';

import './register-form.sass';

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const RegisterForm = observer(() => {
	const { register, registrateState, user } = AuthStore;
	const { RegistrateFormIsOpen, closeRegistrateForm } = PagesStore;

	const [passwordConfirm, setPasswordConfirm] = useState('');
	const [password, setPassword] = useState('');
	const [email, setEmail] = useState('');
	const [login, setLogin] = useState('');

	const onRegistration = () => register(login, email, password);

	return (
		<Modal
			isOpen={RegistrateFormIsOpen}
			toggle={closeRegistrateForm}
			className='register-form'
		>
			<form>
				<p
					className='register-form__fail'
					hidden={!registrateState.startsWith('error:')}
				>
					{registrateState}
				</p>
				<p
					className='register-form__success'
					hidden={user?.email === ''}
				>
					{user.login}, добро пожаловать! Осталось только подтвердить вашу почту
				</p>
				<h2 className='register-form__header'>
					Регистрация
				</h2>

				<label htmlFor='loginInput'>
					Никнейм
				</label>
				<input
					type='text'
					className='register-form__input'
					value={login}
					onChange={(e) => setLogin(e.target.value)}
				/>

				<label htmlFor='emailInput'>
					Электронная почта
				</label>
				<input
					type='email'
					className='register-form__input'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>

				<label htmlFor='passwordInput'>
					Пароль
				</label>
				<input
					type='password'
					className='register-form__input'
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<label htmlFor='passwordConfirmInput'>
					Подтверждение пароля
				</label>
				<input
					type='password'
					className={classnames(
						'register-form__input',
						passwordConfirm
							? passwordConfirm === password
								? 'register-form__input_right'
								: 'register-form__input_wrong'
							: null
					)}
					value={passwordConfirm}
					onChange={(e) => setPasswordConfirm(e.target.value)}
				/>

				<div className='text-center mt-4'>
					<button
						type='button'
						className='register-form__auth-button'
						disabled={
							password !== passwordConfirm
								|| login.length < 1
								|| email.length < 1
								|| password.length < 1
						}
						onClick={onRegistration}
					>
						{registrateState !== 'pending' ? 'Зарегистрироваться' : 'Загрузка...'}
					</button>
				</div>
			</form>
		</Modal>
	);
});

export default RegisterForm;
