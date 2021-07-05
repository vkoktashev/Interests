import React, { useEffect } from "react";
import useInput from "../../../hooks/useInput";
import { observer } from "mobx-react";
import AuthStore from "../../../store/AuthStore";
import PagesStore from "../../../store/PagesStore";
import Modal from "../../Common/Modal/Modal";
import "./login-form.sass";

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const LoginForm = observer((props) => {
	const { tryAuth, authState } = AuthStore;
	const { LoginFormIsOpen, closeLoginForm, openResetPasswordForm, openRegistrateForm } = PagesStore;

	const password = useInput("");
	const login = useInput("");

	useEffect(() => {
		if (authState === "done") closeLoginForm();
	}, [authState, closeLoginForm]);

	return (
		<Modal isOpen={LoginFormIsOpen} toggle={closeLoginForm} className='login-form'>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					tryAuth(login.value, password.value);
				}}>
				<h2 className='login-form__header'>Войти</h2>
				<p className='login-form__fail' hidden={!authState.startsWith("error:")}>
					{authState}
				</p>

				<label htmlFor='loginInput' className='grey-text'>
					Логин
				</label>
				<input type='text' id='loginInput' className='login-form__input' {...login} />

				<label htmlFor='passwordInput' className='grey-text'>
					Пароль
				</label>
				<input type='password' id='passwordInput' className='login-form__input' {...password} />

				<div className='text-center mt-4'>
					<button type='submit' className='login-form__auth-button'>
						{authState !== "pending" ? "Войти" : "Загрузка..."}
					</button>
					<label
						className='login-form__link-label'
						onClick={() => {
							closeLoginForm();
							openResetPasswordForm();
						}}>
						Восстановить пароль
					</label>
					<label
						className='login-form__link-label'
						onClick={() => {
							closeLoginForm();
							openRegistrateForm();
						}}>
						Зарегистрироваться
					</label>
				</div>
			</form>
		</Modal>
	);
});

export default LoginForm;
