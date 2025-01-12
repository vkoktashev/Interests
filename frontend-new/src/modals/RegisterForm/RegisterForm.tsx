import React, {useCallback, useState} from 'react';
import classnames from 'classnames';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {setUser} from '@steroidsjs/core/actions/auth';
import './register-form.scss';

export function RegisterForm(props: IModalProps) {
    const bem = useBem('register-form');
	const {http} = useComponents();
	const dispatch = useDispatch();
	const user = useSelector(getUser);
    const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const [passwordConfirm, setPasswordConfirm] = useState('');
	const [password, setPassword] = useState('');
	const [email, setEmail] = useState('');
	const [login, setLogin] = useState('');

	const onRegistration = useCallback(async () => {
		setLoading(true);
		setError('');
		http.post('/users/auth/signup/', {
			username: login,
			email: email,
			password: password,
		})
			.then(response => {
				console.log(response);
				const user = {
					login: response.username,
					email: response.email,
				};
				dispatch(setUser(user));
			})
			.catch(error => {
				const data = error?.response?.data;
				const errorMessage = data?.error
					|| Object.values(data).flat().flat().join('\n')
					|| __('Ошибка сервера');
				setError(errorMessage);
			})
			.finally(() => setLoading(false));
    }, [login, email, password]);

	return (
		<Modal
            {...props}
            size='sm'
            className={bem.block()}
            onClose={props.onClose}
			title={__('Регистрация')}
		>
			<form>
				<p
					className='register-form__fail'
					hidden={!error}
				>
					{error}
				</p>
				<p
					className='register-form__success'
					hidden={!user?.email}
				>
					{user?.login}, добро пожаловать! Осталось только подтвердить вашу почту
				</p>
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
						{isLoading ? __('Загрузка...') : __('Зарегистрироваться')}
					</button>
				</div>
			</form>
		</Modal>
	);
}
