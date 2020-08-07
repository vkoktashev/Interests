import React from "react";
import { connect } from 'react-redux'; 
import * as selectors from '../store/reducers';
import * as actions from '../store/actions';

import {
	MDBNavbar,
	MDBNavbarNav,
	MDBNavItem,
	MDBIcon,
	MDBNavLink
} from "mdbreact";

import LoginForm from "./LoginForm";
import AccountButton from "./AccountButton";

/**
 * Основная страница приложения
 */
function HomePage ({loggedIn, onLoginClick, onLogoutClick}) 
{
    return (
			<div>
				<MDBNavbar style={{backgroundColor: "#6C0AAB"}} dark expand="md" fixed="top">

					<MDBNavbarNav left hidden={!loggedIn}>
						
					</MDBNavbarNav>

					<MDBNavbarNav right>

						<MDBNavItem className="font-weight-bold">
							<AccountButton onLoginClick={onLoginClick} onLogoutClick={onLogoutClick} loggedIn={loggedIn}/>
						</MDBNavItem>

					</MDBNavbarNav>
				</MDBNavbar>
				ИНТЕРЕСЫ ЕПТЫ 
				<LoginForm/>
			</div>
    	);
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
        }
	}
};

export default connect(mapStateToProps, mapDispatchToProps)(HomePage);