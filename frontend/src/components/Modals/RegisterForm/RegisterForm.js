import React, { useState } from "react";
import { observer } from "mobx-react";
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

	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [login, setLogin] = useState("");

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
				<input type='text' id='loginInput' className='register-form__input' value={login} onChange={(event) => setLogin(event.target.value)} />

				<label htmlFor='emailInput'>Электронная почта</label>
				<input type='email' id='emailInput' className='register-form__input' value={email} onChange={(event) => setEmail(event.target.value)} />

				<label htmlFor='passwordInput'>Пароль</label>
				<input type='password' id='passwordInput' className='register-form__input' value={password} onChange={(event) => setPassword(event.target.value)} />

				<label htmlFor='passwordConfirmInput'>Подтверждение пароля</label>
				<input
					type='password'
					id='passwordConfirmInput'
					className='register-form__input'
					style={passwordConfirm === password ? { outlineColor: "green" } : { outlineColor: "red" }}
					value={passwordConfirm}
					onChange={(event) => setPasswordConfirm(event.target.value)}
				/>

				<div className='text-center mt-4'>
					<button
						type='button'
						className='register-form__auth-button'
						disabled={password !== passwordConfirm || login.length < 1 || email.length < 1 || password.length < 1}
						onClick={() => register(login, email, password)}>
						{registrateState !== "pending" ? "Зарегистрироваться" : "Загрузка..."}
					</button>
				</div>
			</form>
		</Modal>
	);
});

export default RegisterForm;
