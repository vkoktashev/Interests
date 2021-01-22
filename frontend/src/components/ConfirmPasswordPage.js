import React, { useState } from "react";
import "./style.css";
import { connect } from "react-redux";
import * as actions from "../store/actions";
import * as selectors from "../store/reducers";

/**
 * Основная страница приложения
 */
function ConfirmPasswordPage({ confirmPassword, confirmPasswordError }) {
	const [password, setPassword] = useState("");
	const [passwordConfirm, setPasswordConfirm] = useState("");

	let search = window.location.search;
	let params = new URLSearchParams(search);
	let token = params.get("token");

	return (
		<div className='bg'>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					confirmPassword(token, password);
				}}
				className='confirmPasswordForm'>
				<p className='h4'>Обновить пароль</p>
				<p className='note note-danger' hidden={!confirmPasswordError | (confirmPasswordError === "ok")}>
					{confirmPasswordError}
				</p>
				<p className='note note-success' hidden={confirmPasswordError !== "ok"}>
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
	);
}

const mapStateToProps = (state) => ({
	confirmPasswordError: selectors.getConfirmPasswordError(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		confirmPassword: (token, password) => {
			dispatch(actions.confirmPassword(token, password));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmPasswordPage);
