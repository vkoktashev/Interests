import React, {useState} from 'react';

import './reset-password-form.scss';
import {useBem, useComponents} from '@steroidsjs/core/hooks';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {Button, EmailField, Form} from '@steroidsjs/core/ui/form';

export function ResetPasswordForm(props: IModalProps) {
    const bem = useBem('reset-password-form');
	const {http} = useComponents();
	const [error, setError] = useState('');
	const [isLoading, setLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);

	const onSubmit = async (values) => {
		setLoading(true);
		setError('');
		http.send('PUT', '/users/auth/password_reset/', values)
			.then(response => {
				setEmailSent(true);
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
			<Form onSubmit={onSubmit} className={bem.element('form')}>
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

				<EmailField
					attribute='email'
					label={__('Почта')}
					className={bem.element('input')}
				/>

				<Button
					type='submit'
					className='reset-password-form__button'
					label={isLoading ? __('Загрузка...') : __('Сбросить')}
				/>
			</Form>
		</Modal>
	);
}
