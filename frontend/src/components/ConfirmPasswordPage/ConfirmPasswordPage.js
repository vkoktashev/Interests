import React, { useState } from "react";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import "./confirm-password-page.sass";

/**
 * Основная страница приложения
 */
const ConfirmPasswordPage = observer((props) => {
	const { confirmPassword, confirmPasswordState } = AuthStore;

	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");

	let search = window.location.search;
	let params = new URLSearchParams(search);
	let token = params.get("token");

	return (
		<div className='confirm-password-page'>
			<div className='confirm-password-page__body'>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						confirmPassword(token, password);
					}}>
					<h4 className='confirm-password-page__header'>Обновить пароль</h4>
					<p className='note note-danger confirm-password-page__fail' hidden={!confirmPasswordState.startsWith("error:")}>
						{confirmPasswordState}
					</p>
					<p className='note note-success confirm-password-page__success' hidden={confirmPasswordState !== "done"}>
						Пароль обновлен!
					</p>

					<label htmlFor='passwordInput'>Новый пароль</label>
					<input type='password' id='passwordInput' className='confirm-password-page__input' value={password} onChange={(event) => setPassword(event.target.value)} />

					<label htmlFor='passwordConfurmInput'>Подтверждение пароля</label>
					<input type='password' id='passwordConfurmInput' className='confirm-password-page__input' value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />

					<button type='submit' className='confirm-password-page__button' disabled={(password !== passwordConfirm) | (password.length < 1)}>
						Обновить
					</button>
				</form>
			</div>
		</div>
	);
});

export default ConfirmPasswordPage;
