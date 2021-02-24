import React, { useState } from "react";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";

import { MDBModal, MDBModalBody, MDBContainer, MDBRow, MDBCol, MDBBtn } from "mdbreact";
import "./style.css";

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const RegistrationForm = observer((props) => {
	const { register, registrateState, user } = AuthStore;
	const { RegistrateFormIsOpen, closeRegistrateForm } = PagesStore;

	const [passwordConfirm, setPasswordConfirm] = useState("");
	const [password, setPassword] = useState("");
	const [email, setEmail] = useState("");
	const [login, setLogin] = useState("");

	return (
		<MDBModal isOpen={RegistrateFormIsOpen} toggle={closeRegistrateForm} size='sm' centered>
			<MDBModalBody className='registrationBody'>
				<MDBContainer>
					<MDBRow>
						<MDBCol>
							<form>
								<p className='note note-danger' hidden={!registrateState.startsWith("error:")}>
									{registrateState}
								</p>
								<p className='note note-success' hidden={user.email === ""}>
									{user.login}, добро пожаловать! Осталось только подтвердить вашу почту
								</p>
								<h4>Регистрация</h4>

								<label htmlFor='loginInput'>Никнейм</label>
								<input type='text' id='loginInput' className='form-control' value={login} onChange={(event) => setLogin(event.target.value)} />

								<label htmlFor='emailInput'>Электронная почта</label>
								<input type='email' id='emailInput' className='form-control' value={email} onChange={(event) => setEmail(event.target.value)} />

								<label htmlFor='passwordInput'>Пароль</label>
								<input type='password' id='passwordInput' className='form-control' value={password} onChange={(event) => setPassword(event.target.value)} />

								<label htmlFor='passwordConfirmInput'>Подтверждение пароля</label>
								<input
									type='password'
									id='passwordConfirmInput'
									className='form-control'
									style={passwordConfirm === password ? { outlineColor: "green" } : { outlineColor: "red" }}
									value={passwordConfirm}
									onChange={(event) => setPasswordConfirm(event.target.value)}
								/>

								<div className='text-center mt-4'>
									<MDBBtn
										type='button'
										className='confirmButton'
										disabled={password !== passwordConfirm || login.length < 1 || email.length < 1 || password.length < 1}
										onClick={() => register(login, email, password)}>
										Зарегистрироваться
									</MDBBtn>
								</div>
							</form>
						</MDBCol>
					</MDBRow>
				</MDBContainer>
			</MDBModalBody>
		</MDBModal>
	);
});

export default RegistrationForm;
