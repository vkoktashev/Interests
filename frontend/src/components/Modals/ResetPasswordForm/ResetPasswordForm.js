import React, { useState } from "react";
import { observer } from "mobx-react";
import AuthStore from "../../../store/AuthStore";
import PagesStore from "../../../store/PagesStore";
import "./reset-password-form.sass";

import { MDBModal, MDBModalBody, MDBContainer, MDBRow, MDBCol, MDBBtn } from "mdbreact";

/**
 * КОмпонент формы сброса пароля
 * @param {number} Параметр, при изменении которого компонент открывается
 */
const ResetPasswordForm = observer((props) => {
	const { resetPassword, resetPasswordState } = AuthStore;
	const { ResetPasswordFormIsOpen, closeResetPasswordForm } = PagesStore;

	const [email, setEmail] = useState("");

	return (
		<MDBModal isOpen={ResetPasswordFormIsOpen} toggle={closeResetPasswordForm} size='sm' centered>
			<MDBModalBody className='reset-password-form'>
				<MDBContainer>
					<MDBRow>
						<MDBCol>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									resetPassword(email);
								}}>
								<p className='h4 text-center mb-4'>Сбросить пароль</p>
								<p className='note note-danger reset-password-form__fail' hidden={!resetPasswordState.startsWith("error:")}>
									{resetPasswordState}
								</p>
								<p className='note note-success reset-password-form__success' hidden={resetPasswordState !== "done"}>
									На вашу почту отправлено письмо
								</p>

								<label htmlFor='emailInput' className='grey-text'>
									Почта
								</label>
								<input type='text' id='emailInput' className='reset-password-form__input' value={email} onChange={(event) => setEmail(event.target.value)} />

								<div className='text-center mt-4'>
									<MDBBtn type='submit' className='reset-password-form__button'>
										{resetPasswordState !== "pending" ? "Сбросить" : "Загрузка..."}
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

export default ResetPasswordForm;
