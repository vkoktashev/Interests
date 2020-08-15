import React from "react";
import {
	MDBNavbar,
    MDBNavItem,
    MDBNavbarBrand,
    MDBNavbarNav,
    MDBNavLink,
    MDBIcon
} from "mdbreact";

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

function Navbar( {loggedIn, onLoginClick, onLogoutClick, onRegistrationClick} ) {
    
    return(
            <MDBNavbar style={{backgroundColor: "#6C0AAB" }} dark expand="md" fixed="top">
            <MDBNavbarBrand>
                <strong className="white-text">Interests</strong>
            </MDBNavbarBrand>
            <MDBNavbarNav left>
                
            </MDBNavbarNav>

            <MDBNavbarNav right>
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
