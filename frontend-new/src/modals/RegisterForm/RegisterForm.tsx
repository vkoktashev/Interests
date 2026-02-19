import React, {useCallback, useState} from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {setUser} from '@steroidsjs/core/actions/auth';
import './register-form.scss';
import {Button, EmailField, Form, InputField, PasswordField} from '@steroidsjs/core/ui/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';

const REGISTRATION_FORM = 'registration_form';

export function RegisterForm(props: IModalProps) {
    const bem = useBem('register-form');
	const {http} = useComponents();
	const dispatch = useDispatch();
	const user = useSelector(getUser);
    const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const {username, email, password, passwordConfirm} = useSelector(state => getFormValues(state, REGISTRATION_FORM) || {});
	const isInvalid = password !== passwordConfirm
		|| !username?.length
		|| !email?.length
		|| !password?.length;

	const onRegistration = useCallback(async (values: Record<string, string>) => {
		setLoading(true);
		setError('');
		try {
			const response = await http.post('/users/auth/signup/', values);
			dispatch(setUser({
				login: response.username,
				email: response.email,
			}));
		} catch (error) {
			const data = error?.response?.data;
			const errorMessage = data?.error
				|| (data && Object.values(data).flat().flat().join('\n'))
				|| __('Ошибка сервера');
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
    }, [dispatch, http]);

	return (
		<Modal
            {...props}
            size='sm'
            className={bem.block()}
            onClose={props.onClose}
			title={__('Регистрация')}
		>
			<Form
				formId={REGISTRATION_FORM}
				onSubmit={onRegistration}
				className={bem.element('form')}
				useRedux
			>
				<p
					className={bem.element('fail')}
					hidden={!error}
				>
					{error}
				</p>
				<p
					className={bem.element('success')}
					hidden={!user?.email}
				>
					{user?.login}, добро пожаловать! Осталось только подтвердить вашу почту
				</p>
				<div className={bem.element('fields')}>
					<InputField
						attribute='username'
						label={__('Никнейм')}
						className={bem.element('input')}
					/>
					<EmailField
						attribute='email'
						label={__('Электронная почта')}
						className={bem.element('input')}
					/>

					<PasswordField
						attribute='password'
						label={__('Пароль')}
						className={bem.element('input')}
					/>
					<PasswordField
						attribute='passwordConfirm'
						label={__('Подтверждение пароля')}
						className={bem.element('input')}
						errors={[passwordConfirm !== password && __('Пароли не совпадают')].filter(Boolean)}
					/>
				</div>

				<div className={bem.element('actions')}>
					<Button
						type='submit'
						className={bem.element('auth-button')}
						disabled={isInvalid}
						label={isLoading ? __('Загрузка...') : __('Зарегистрироваться')}
					/>
				</div>
			</Form>
		</Modal>
	);
}
