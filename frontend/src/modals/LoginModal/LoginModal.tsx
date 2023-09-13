import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import './LoginModal.scss';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import {Button, Form, InputField} from '@steroidsjs/core/ui/form';
import {useCallback, useState} from 'react';
import {Link} from '@steroidsjs/core/ui/nav';

interface ILoginModalProps extends IModalProps {}

const LOGIN_FORM_ID = 'LoginForm';

function LoginModal(props: ILoginModalProps) {
    const bem = useBem('LoginModal');
    const [error, setError] = useState('');

    const onPasswordRecovery = async () => {
        // await closeLoginForm();
        // await openResetPasswordForm();
    }

    const onRegistration = async () => {
        // await closeLoginForm();
        // await openRegistrateForm();
    }

    const onComplete = useCallback((values, result) => {
        console.log(result);
    }, []);

    return (
        <Modal {...props}
            size='sm'
            className={bem.block()}
            shouldCloseOnEsc
        >
            <div className={bem.element('modalContainer')}>
                <Form formId={LOGIN_FORM_ID}
                      action={'users/auth/login/'}
                      onComplete={onComplete}
                      className={bem.element('form')}
                >
                    <h2 className={bem.element('header')}>
                        {__('Войти')}
                    </h2>
                    {
                        error && (
                            <p className={bem.element('error')}>
                                {error}
                            </p>
                        )
                    }
                    <InputField attribute='login'
                        label={__('Логин')}
                        className={bem.element('input')}
                    />
                    <InputField attribute='password'
                        type='password'
                        label={__('Пароль')}
                        className={bem.element('input')}
                    />

                    <Button
                        type={'submit'}
                        label={__('Войти')}
                        className={bem.element('auth-button')}
                    />
                    <Link
                        label={__('Восстановить пароль')}
                        className={bem.element('link-label')}
                        onClick={onPasswordRecovery}
                    />
                    <Link
                        label={__('Зарегистрироваться')}
                        className={bem.element('link-label')}
                        onClick={onRegistration}
                    />
                </Form>
            </div>
        </Modal>
    );
}

export default LoginModal;
