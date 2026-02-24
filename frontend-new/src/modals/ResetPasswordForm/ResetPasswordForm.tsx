import React, {useCallback, useState} from 'react';

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

	const onSubmit = useCallback(async (values: Record<string, string>) => {
		setLoading(true);
		setError('');
		try {
			await http.send('PUT', '/users/auth/password_reset/', values);
			setEmailSent(true);
		} catch (error) {
			const errorMessage = error?.response?.data?.error || __('Ошибка сервера');
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [http]);

	return (
		<Modal
            {...props}
            size='sm'
            className={bem.block()}
            onClose={props.onClose}
			title={__('Сбросить пароль')}
		>
			<Form onSubmit={onSubmit} className={bem.element('form')}>
				<div className={bem.element('intro')}>
					<div className={bem.element('intro-title')}>{__('Восстановление доступа')}</div>
					<div className={bem.element('intro-text')}>
						{__('Введите email, указанный при регистрации. Мы отправим письмо со ссылкой для сброса пароля.')}
					</div>
				</div>

				{!!error && (
					<p className={bem.element('fail')}>
						{error}
					</p>
				)}

				{emailSent && (
					<p className={bem.element('success')}>
						{__('На вашу почту отправлено письмо')}
					</p>
				)}

				{!emailSent && (
					<>
						<div className={bem.element('fields')}>
							<EmailField
								attribute='email'
								label={__('Почта')}
								placeholder='name@example.com'
								className={bem.element('input')}
								inputProps={{autoComplete: 'email'}}
							/>
						</div>

						<div className={bem.element('footer')}>
							<div className={bem.element('actions')}>
								<Button
									type='submit'
									className={bem.element('button')}
									label={isLoading ? __('Отправляем...') : __('Сбросить пароль')}
									disabled={isLoading}
								/>
							</div>
						</div>
					</>
				)}
			</Form>
		</Modal>
	);
}
