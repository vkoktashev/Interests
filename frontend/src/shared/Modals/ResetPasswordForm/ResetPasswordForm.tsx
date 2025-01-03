import React, {useState} from 'react';
import { observer } from 'mobx-react';

import AuthStore from '../../../store/AuthStore';
import PagesStore from '../../../store/PagesStore';
import Modal from '../../Modal';

import './reset-password-form.sass';

/**
 * КОмпонент формы сброса пароля
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const ResetPasswordForm = observer(() => {
	const { resetPassword, resetPasswordState } = AuthStore;
	const { ResetPasswordFormIsOpen, closeResetPasswordForm } = PagesStore;

	const [email, setEmail] = useState('');

	const onSubmit = async (event: any) => {
		event.preventDefault();
		await resetPassword(email);
	};

	return (
		<Modal isOpen={ResetPasswordFormIsOpen} toggle={closeResetPasswordForm} className='reset-password-form'>
			<form onSubmit={onSubmit}>
				<h2 className='reset-password-form__header'>
					Сбросить пароль
				</h2>
				<p
					className='reset-password-form__fail'
					hidden={!resetPasswordState.startsWith('error:')}
				>
					{resetPasswordState}
				</p>
				<p
					className='reset-password-form__success'
					hidden={resetPasswordState !== 'done'}
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
					{resetPasswordState !== 'pending' ? 'Сбросить' : 'Загрузка...'}
				</button>
			</form>
		</Modal>
	);
});

export default ResetPasswordForm;
