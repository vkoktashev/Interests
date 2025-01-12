import React, {useCallback, useState} from 'react';
import {Button, Form, InputField} from '@steroidsjs/core/ui/form';
import {useComponents, useSelector} from '@steroidsjs/core/hooks';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import './confirm-password-page.scss';

const formId = 'ConfirmPasswordForm';
function ConfirmPasswordPage() {
	const {http} = useComponents();
	const formValues = useSelector(state => getFormValues(state,formId));
	const [state, setState] = useState('');

	let search = window.location.search;
	let params = new URLSearchParams(search);
	let token = params.get("token");

	const onSubmit = useCallback((values) => {
		http
			.send('PATCH', `/users/auth/confirm_password_reset/?reset_token=${token}`, values)
			.then(() => setState('done'))
			.catch(e => {
				setState(`error: ${Object.values(e?.response?.data).flat().flat().join('\n')}`);
			});
	}, [token]);

	return (
		<div className='confirm-password-page'>
			<div className='confirm-password-page__body'>
				<Form
					formId={formId}
					onSubmit={onSubmit}
					useRedux
				>
					<h4 className='confirm-password-page__header'>Обновить пароль</h4>
					<p className='note note-danger confirm-password-page__fail' hidden={!state.startsWith("error:")}>
						{state}
					</p>
					<p className='note note-success confirm-password-page__success' hidden={state !== "done"}>
						Пароль обновлен!
					</p>

					<label htmlFor='passwordInput'>
						Новый пароль
					</label>
					<InputField
						type='password'
						attribute='password'
						className='confirm-password-page__input'
						size='sm'
					/>
					<label htmlFor='passwordConfirmInput'>
						Подтверждение пароля
					</label>
					<InputField
						type='password'
						attribute='passwordConfirm'
						className='confirm-password-page__input'
						size='sm'
					/>

					<Button
						type='submit'
						className='confirm-password-page__button'
						disabled={(formValues?.password !== formValues?.passwordConfirm) || (!formValues?.password?.length)}
					>
						Обновить
					</Button>
				</Form>
			</div>
		</div>
	);
}

export default ConfirmPasswordPage;
