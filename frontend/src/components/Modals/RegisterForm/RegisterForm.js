import React from "react";
import { observer } from "mobx-react";
import classnames from "classnames";
import useInput from "../../../hooks/useInput";
import AuthStore from "../../../store/AuthStore";
import PagesStore from "../../../store/PagesStore";
import Modal from "../../Common/Modal/Modal";
import "./register-form.sass";

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const RegisterForm = observer((props) => {
	const { register, registrateState, user } = AuthStore;
	const { RegistrateFormIsOpen, closeRegistrateForm } = PagesStore;

	const passwordConfirm = useInput("");
	const password = useInput("");
	const email = useInput("");
	const login = useInput("");

	return (
		<Modal isOpen={RegistrateFormIsOpen} toggle={closeRegistrateForm} className='register-form'>
			<form>
				<p className='register-form__fail' hidden={!registrateState.startsWith("error:")}>
					{registrateState}
				</p>
				<p className='register-form__success' hidden={user?.email === ""}>
					{user.login}, добро пожаловать! Осталось только подтвердить вашу почту
				</p>
				<h2 className='register-form__header'> Регистрация</h2>

				<label htmlFor='loginInput'>Никнейм</label>
				<input type='text' id='loginInput' className='register-form__input' {...login} />

				<label htmlFor='emailInput'>Электронная почта</label>
				<input type='email' id='emailInput' className='register-form__input' {...email} />

				<label htmlFor='passwordInput'>Пароль</label>
				<input type='password' id='passwordInput' {...password} className='register-form__input' />

				<label htmlFor='passwordConfirmInput'>Подтверждение пароля</label>
				<input
					type='password'
					id='passwordConfirmInput'
					{...passwordConfirm}
					className={classnames("register-form__input", !passwordConfirm.value ? "" : passwordConfirm.value === password.value ? "register-form__input_right" : "register-form__input_wrong")}
				/>

				<div className='text-center mt-4'>
					<button
						type='button'
						className='register-form__auth-button'
						disabled={password.value !== passwordConfirm.value || login.value.length < 1 || email.value.length < 1 || password.value.length < 1}
						onClick={() => register(login.value, email.value, password.value)}>
						{registrateState !== "pending" ? "Зарегистрироваться" : "Загрузка..."}
					</button>
				</div>
			</form>
		</Modal>
	);
});

export default RegisterForm;
