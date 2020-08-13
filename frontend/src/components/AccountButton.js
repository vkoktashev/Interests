import React from "react";
import {
	MDBIcon,
    MDBNavLink,
    MDBNavItem
} from "mdbreact";

function AccountButton( {loggedIn, onLoginClick, onLogoutClick, onRegistrationClick} ) {
    
    if (loggedIn)
        return (
        <MDBNavItem className="font-weight-bold">
            <MDBNavLink to="#" onClick={ onLogoutClick }>
                <MDBIcon icon="sign-out-alt" /> Выйти
            </MDBNavLink>
        </MDBNavItem>
        );
    else
        return(
            <div>
                <MDBNavItem className="font-weight-bold">
                    <MDBNavLink to="#" onClick={onLoginClick} >
                        <MDBIcon icon="sign-in-alt" /> Войти
                    </MDBNavLink>
                </MDBNavItem>
                <MDBNavItem className="font-weight-bold">
                    <MDBNavLink to="#" onClick={onRegistrationClick} >
                        <MDBIcon icon="sign-in-alt" /> Регистрация
                    </MDBNavLink>
                </MDBNavItem>
            </div>
            
        );
}

export default AccountButton;