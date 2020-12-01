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
    MDBFormInline,
    MDBDropdown,
    MDBDropdownItem,
    MDBDropdownMenu,
    MDBDropdownToggle
} from "mdbreact";

import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

function Navbar( {loggedIn, onLoginClick, onLogoutClick, onRegistrationClick, user} ) {
    let history = useHistory();

    return(
            <MDBNavbar style={{ backgroundColor: "#4527a0" }} dark expand="md" fixed="top">
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
                        <MDBIcon icon="sign-in-alt" /> Войти
                    </MDBNavLink>
                </MDBNavItem>
                <MDBNavItem className="font-weight-bold" hidden={loggedIn}>
                    <MDBNavLink to="#" onClick={onRegistrationClick} >
                        <MDBIcon icon="user-plus" /> Зарегистрироваться
                    </MDBNavLink>
                </MDBNavItem>
                <MDBNavItem hidden={!loggedIn} className="font-weight-bold">
                    <MDBDropdown>
                        <MDBDropdownToggle nav caret>
                        <span className="mr-2">{user.username}</span>
                        </MDBDropdownToggle>
                        <MDBDropdownMenu>
                        <MDBDropdownItem href={"/user/"+user.id}>Профиль</MDBDropdownItem>
                        <MDBDropdownItem onClick={ onLogoutClick }>
                            <MDBIcon icon="sign-out-alt"/> Выйти
                        </MDBDropdownItem>
                        </MDBDropdownMenu>
                    </MDBDropdown>
                </MDBNavItem>
            </MDBNavbarNav>
        </MDBNavbar>
    )
}

const mapStateToProps = state => ({
    loggedIn: selectors.getLoggedIn(state),
    user: selectors.getUser(state)
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
