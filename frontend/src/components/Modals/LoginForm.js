import React, { useState } from "react";
import { MDBModal, MDBModalBody, MDBContainer, MDBRow, MDBCol, MDBBtn } from "mdbreact";
import "./style.css";
import { connect } from "react-redux";
import * as actions from "../../store/actions";
import * as selectors from "../../store/reducers";

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
function LoginForm({ isOpen, closeForm, logIn, authError, openResetPasswordForm }) {
	const [password, setPassword] = useState("");
	const [login, setLogin] = useState("");

	return (
		<MDBModal isOpen={isOpen} toggle={closeForm} size='sm' centered>
			<MDBModalBody className='loginBody'>
				<MDBContainer>
					<MDBRow>
						<MDBCol>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									logIn(login, password);
								}}>
								<p className='h4 text-center mb-4'>Войти</p>
								<p className='note note-danger' hidden={!authError}>
									Неверный логин или пароль!
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
											closeForm();
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
}

const mapStateToProps = (state) => ({
	isOpen: selectors.getLoginForm(state),
	authError: selectors.getAuthError(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		closeForm: () => {
			dispatch(actions.closeLoginForm());
		},
		logIn: (login, password) => {
			dispatch(actions.tryAuth(login, password));
		},
		openResetPasswordForm: () => {
			dispatch(actions.openResetPasswordForm());
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginForm);
