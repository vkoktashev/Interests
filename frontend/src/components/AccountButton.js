import React from "react";
import {
	MDBIcon,
	MDBNavLink
} from "mdbreact";

function AccountButton( {loggedIn, onLoginClick, onLogoutClick} ) {
    
    if (loggedIn)
        return (
        <MDBNavLink to="#" onClick={ onLogoutClick }>
            <MDBIcon icon="sign-in-alt"/> Выйти
        </MDBNavLink>
        );
    else
        return(
            <MDBNavLink to="#" onClick={onLoginClick} >
                <MDBIcon icon="sign-in-alt" /> Войти
            </MDBNavLink>
        );
}

export default AccountButton;