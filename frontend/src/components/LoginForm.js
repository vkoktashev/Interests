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
function LoginForm( {isOpen, closeForm, logIn, authError} ) {
	return (
        <MDBModal isOpen={isOpen} toggle={closeForm} size="sm" centered>
	    <MDBModalBody>
	      <MDBContainer>
	        <MDBRow>
	          <MDBCol>
	            <form onSubmit={(event) => {event.preventDefault();
										logIn(document.getElementById("loginInput").value,
											document.getElementById("passwordInput").value)}}>
	              <p className="h4 text-center mb-4">Войти</p>
				  <p className="note note-danger" hidden={!authError} >Неверный логин или пароль!</p>
	              <label htmlFor="loginInput" className="grey-text">
	                Логин
	              </label>
	              <input type="text" id="loginInput" className="form-control" />
	              <br />
	              <label htmlFor="passwordInput" className="grey-text">
	                Пароль
	              </label>
	              <input type="password" id="passwordInput" className="form-control" />
	              <div className="text-center mt-4">
					<MDBBtn style={{color: "white", backgroundColor: "#6C0AAB"}} type="submit">
						Войти
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
	isOpen: selectors.getLoginForm(state),
	authError: selectors.getAuthError(state)
  });

const mapDispatchToProps = (dispatch) => {
	return {
		closeForm: () => {
			dispatch(actions.closeLoginForm());
		},
		logIn: (login, password) => {
			dispatch(actions.tryAuth(login, password));
		},
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginForm);
