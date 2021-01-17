import React, { useState } from "react";
import { MDBModal, MDBModalBody, MDBContainer, MDBRow, MDBCol, MDBBtn } from "mdbreact";
import "./style.css";
import { connect } from "react-redux";
import * as actions from "../../store/actions";
import * as selectors from "../../store/reducers";

/**
 * КОмпонент формы сброса пароля
 * @param {number} Параметр, при изменении которого компонент открывается
 */
function ResetPasswordForm({ isOpen, closeForm, resetPassword, resetPasswordError }) {
	const [email, setEmail] = useState("");

	return (
		<MDBModal isOpen={isOpen} toggle={closeForm} size='sm' centered>
			<MDBModalBody className='loginBody'>
				<MDBContainer>
					<MDBRow>
						<MDBCol>
							<form
								onSubmit={(event) => {
									event.preventDefault();
									resetPassword(email);
								}}>
								<p className='h4 text-center mb-4'>Сбросить пароль</p>
								<p className='note note-danger' hidden={!resetPasswordError | (resetPasswordError === "ok")}>
									{resetPasswordError}
								</p>
								<p className='note note-success' hidden={resetPasswordError !== "ok"}>
									На вашу почту отправлено письмо
								</p>

								<label htmlFor='emailInput' className='grey-text'>
									Почта
								</label>
								<input type='text' id='emailInput' className='form-control' value={email} onChange={(event) => setEmail(event.target.value)} />

								<div className='text-center mt-4'>
									<MDBBtn type='submit' className='confirmButton'>
										Сбросить
									</MDBBtn>
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
	isOpen: selectors.getResetPasswordForm(state),
	resetPasswordError: selectors.getResetPasswordError(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		closeForm: () => {
			dispatch(actions.closeResetPasswordForm());
		},
		resetPassword: (email) => {
			dispatch(actions.resetPassword(email));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ResetPasswordForm);
