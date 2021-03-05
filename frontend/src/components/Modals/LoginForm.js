import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";

import { MDBModal, MDBModalBody, MDBContainer, MDBRow, MDBCol, MDBBtn } from "mdbreact";

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const LoginForm = observer((props) => {
	const { tryAuth, authState } = AuthStore;
	const { LoginFormIsOpen, closeLoginForm, openResetPasswordForm } = PagesStore;

	const [password, setPassword] = useState("");
	const [login, setLogin] = useState("");

	useEffect(() => {
		if (authState === "done") closeLoginForm();
	}, [authState, closeLoginForm]);

	return (
		<MDBModal isOpen={LoginFormIsOpen} toggle={closeLoginForm} size='sm' centered>
			<MDBModalBody className='loginBody'>
				<MDBContainer>
					<MDBRow>
						<MDBCol>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									tryAuth(login, password);
								}}>
								<p className='h4 text-center mb-4'>Войти</p>
								<p className='note note-danger' hidden={!authState.startsWith("error:")}>
									{authState}
								</p>

								<label htmlFor='loginInput' className='grey-text'>
									Логин
								</label>
								<input type='text' id='loginInput' className='form-control' value={login} onChange={(event) => setLogin(event.target.value)} />

								<label htmlFor='passwordInput' className='grey-text'>
									Пароль
								</label>
								<input type='password' id='passwordInput' className='form-control' value={password} onChange={(event) => setPassword(event.target.value)} />

								<div className='text-center mt-4'>
									<MDBBtn type='submit' className='confirmButton'>
										Войти
									</MDBBtn>
									<label
										className='passwordResetLabel'
										onClick={() => {
											closeLoginForm();
											openResetPasswordForm();
										}}>
										Восстановить пароль
									</label>
								</div>
							</form>
						</MDBCol>
					</MDBRow>
				</MDBContainer>
			</MDBModalBody>
		</MDBModal>
	);
});

export default LoginForm;
