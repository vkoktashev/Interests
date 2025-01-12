import React, {useState} from 'react';

import './reset-password-form.scss';
import {useBem, useComponents} from '@steroidsjs/core/hooks';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import Modal from '@steroidsjs/core/ui/modal/Modal';

export function ResetPasswordForm(props: IModalProps) {
    const bem = useBem('reset-password-form');
	const {http} = useComponents();
	const [error, setError] = useState('');
	const [isLoading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [email, setEmail] = useState('');

	const onSubmit = async (event: any) => {
		event.preventDefault();
		setLoading(true);
		setError('');
		http.send('PUT', '/users/auth/password_reset/', {
			email,
		})
			.then(response => {
				setEmailSent(true);
				console.log(response);
			})
			.catch(error => {
				const errorMessage = error?.response?.data?.error || __('Ошибка сервера');
				setError(errorMessage);
			})
			.finally(() => setLoading(false));
	};

	return (
		<Modal
            {...props}
            size='sm'
            className={bem.block()}
            onClose={props.onClose}
			title={__('Сбросить пароль')}
        >
			<form onSubmit={onSubmit}>
				<p
					className='reset-password-form__fail'
					hidden={!error}
				>
					{error}
				</p>
				<p
					className='reset-password-form__success'
					hidden={!emailSent}
				>
					На вашу почту отправлено письмо
				</p>

				<label htmlFor='emailInput'>
					Почта
				</label>
				<input
					type='text'
					className='reset-password-form__input'
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>

				<button type='submit' className='reset-password-form__button'>
					{isLoading ? __('Загрузка...') : __('Сбросить')}
				</button>
			</form>
		</Modal>
	);
}
