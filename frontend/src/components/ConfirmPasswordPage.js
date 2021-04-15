import React, { useState } from "react";
import { observer } from "mobx-react";
import AuthStore from "../store/AuthStore";

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
		<div>
			<div className='bg' />
			<div className='contentPage'>
				<div className='contentBody'>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							confirmPassword(token, password);
						}}
						className='confirmPasswordForm'>
						<p className='h4'>Обновить пароль</p>
						<p className='note note-danger' hidden={!confirmPasswordState.startsWith("error:")}>
							{confirmPasswordState}
						</p>
						<p className='note note-success' hidden={confirmPasswordState !== "done"}>
							Пароль обновлен!
						</p>

						<label htmlFor='passwordInput' className='confirmPasswordLabel'>
							Новый пароль
						</label>
						<br />
						<input type='password' id='passwordInput' className='confirmPasswordInput' value={password} onChange={(event) => setPassword(event.target.value)} />
						<br />

						<label htmlFor='passwordConfurmInput' className='confirmPasswordLabel'>
							Подтверждение пароля
						</label>
						<br />
						<input type='password' id='passwordConfurmInput' className='confirmPasswordInput' value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />
						<br />

						<button type='submit' className='confirmPasswordButton' disabled={(password !== passwordConfirm) | (password.length < 1)}>
							Обновить
						</button>
					</form>
				</div>
			</div>
		</div>
	);
});

export default ConfirmPasswordPage;
