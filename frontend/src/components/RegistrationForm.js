import React from "react";
import {
	MDBModal, 
	MDBModalBody,
	MDBContainer,
    MDBRow,
    MDBCol,
    MDBBtn
} from "mdbreact";
import { connect } from 'react-redux'; 
import * as actions from '../store/actions';
import * as selectors from '../store/reducers';

/**
 * КОмпонент формы авторизации
 * @param {number} Параметр, при изменении которого компонент открывается 
 */
function RegistrationForm( {isOpen, closeForm, registrate, registrateArror, user} ) {
	return (
        <MDBModal isOpen={isOpen} toggle={closeForm} size="sm" centered>
	    <MDBModalBody>
	      <MDBContainer>
	        <MDBRow>
	          <MDBCol>
	            <form>
	              <p className="h4 text-center mb-4">Регистрация</p>
				  <p className="note note-danger" hidden={!registrateArror} >Ошибка регистрации!</p>
                  <p className="note note-success" hidden={user.email===""} >{user.login}, добро пожаловать! Осталось только подтвердить вашу почту: {user.email}</p>
	              <label htmlFor="loginInput" className="grey-text">
	                Никнейм
	              </label>
	              <input type="text" id="loginInput" className="form-control" />
	              <br />
                  <label htmlFor="emailInput" className="grey-text">
	                Электронная почта
	              </label>
	              <input type="email" id="emailInput" className="form-control" />
	              <br />
	              <label htmlFor="passwordInput" className="grey-text">
	                Пароль
	              </label>
	              <input type="password" id="passwordInput" className="form-control" />
	              <div className="text-center mt-4">
                    <MDBBtn style={{color: "white", backgroundColor: "#6C0AAB"}} type="button" onClick={() => registrate(document.getElementById("loginInput").value,
                                                                                                                        document.getElementById("emailInput").value,
																													    document.getElementById("passwordInput").value)}>
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
}

const mapStateToProps = state => ({
	isOpen: selectors.getRegistrateForm(state),
    registrateArror: selectors.getRegistrateError(state),
    user: selectors.getUser(state)
  });

const mapDispatchToProps = (dispatch) => {
	return {
		closeForm: () => {
			dispatch(actions.closeRegistrateForm());
		},
		registrate: (login, email, password) => {
			dispatch(actions.registrationRequest(login, email, password));
		},
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(RegistrationForm);
