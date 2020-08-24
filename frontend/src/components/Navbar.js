import React from "react";
import {
    useHistory
  } from "react-router-dom";

import {
	MDBNavbar,
    MDBNavItem,
    MDBNavbarBrand,
    MDBNavbarNav,
    MDBNavLink,
    MDBIcon,
    MDBFormInline
} from "mdbreact";

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

function Navbar( {loggedIn, onLoginClick, onLogoutClick, onRegistrationClick} ) {
    let history = useHistory();

    return(
            <MDBNavbar style={{ backgroundColor: "#6C0AAB" }} dark expand="md" fixed="top">
            <MDBNavbarBrand>
                <strong className="white-text">Interests</strong>
            </MDBNavbarBrand>
            <MDBNavbarNav left>
                
            </MDBNavbarNav>

            <MDBNavbarNav right>
                <MDBNavItem>
                    <MDBFormInline onSubmit={ (event) => {event.preventDefault(); history.push('/search/' + document.getElementById('searchInput').value); return false; }}>
                        <div className="md-form my-0">
                        <input className="form-control mr-sm-2" type="text" placeholder="Найти" aria-label="Найти"
                            id="searchInput"/>
                        </div>
                    </MDBFormInline>
                </MDBNavItem>

                <MDBNavItem className="font-weight-bold" hidden={loggedIn}>
                    <MDBNavLink to="#" onClick={onLoginClick} >
                        <MDBIcon icon="sign-in-alt" /> Уже смешарик
                    </MDBNavLink>
                </MDBNavItem>
                <MDBNavItem className="font-weight-bold" hidden={loggedIn}>
                    <MDBNavLink to="#" onClick={onRegistrationClick} >
                        <MDBIcon fab icon="accessible-icon" /> Стать смешариком
                    </MDBNavLink>
                </MDBNavItem>
                <MDBNavItem className="font-weight-bold" hidden={!loggedIn}>
                    <MDBNavLink to="#" onClick={ onLogoutClick }>
                        <MDBIcon icon="sign-out-alt"/> Выйти
                    </MDBNavLink>
                </MDBNavItem>
            </MDBNavbarNav>
        </MDBNavbar>
    )
}

const mapStateToProps = state => ({
	loggedIn: selectors.getLoggedIn(state)
});

  const mapDispatchToProps = (dispatch) => {
	return {
		onLoginClick: () => {
			dispatch(actions.openLoginForm());
        },
        onLogoutClick: () =>{
            dispatch(actions.resetAuthorization());
        },
        onRegistrationClick: () =>{
            dispatch(actions.openRegistrateForm());
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(Navbar);
