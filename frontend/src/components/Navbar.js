import React from "react";
import {
	MDBNavbar,
    MDBNavItem,
    MDBNavbarBrand,
    MDBNavbarNav
} from "mdbreact";

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';
import AccountButton from "./AccountButton";

function Navbar( {loggedIn, onLoginClick, onLogoutClick, onRegistrationClick} ) {
    
    return(
        <MDBNavbar style={{backgroundColor: "#6C0AAB"}} dark expand="md" fixed="top">
            <MDBNavbarBrand>
                <strong className="white-text">Interests</strong>
            </MDBNavbarBrand>
            <MDBNavbarNav left>
                
            </MDBNavbarNav>

            <MDBNavbarNav right>
                <AccountButton onLoginClick={onLoginClick} onLogoutClick={onLogoutClick} onRegistrationClick={onRegistrationClick} loggedIn={loggedIn}/>
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
