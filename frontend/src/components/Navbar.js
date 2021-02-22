import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../store/AuthStore";
import PagesStore from "../store/PagesStore";

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
	MDBDropdownToggle,
	MDBNavbarToggler,
	MDBCollapse,
} from "mdbreact";

const Navbar = observer((props) => {
	const { loggedIn, user, resetAuthorization } = AuthStore;
	const { openLoginForm, openRegistrateForm } = PagesStore;

	let history = useHistory();
	const [collapseID, setCollapseID] = useState("");

	const toggleCollapse = (newCollapseID) => () => {
		if (newCollapseID !== collapseID) setCollapseID(newCollapseID);
		else setCollapseID("");
	};

	return (
		<MDBNavbar style={{ backgroundColor: "#4527a0" }} dark expand='md' fixed='top'>
			<MDBNavbarBrand
				onClick={(event) => {
					event.preventDefault();
					history.push("/");
					return false;
				}}>
				<strong className='white-text' style={{ cursor: "pointer" }}>
					Interests
				</strong>
			</MDBNavbarBrand>
			<MDBNavbarNav left></MDBNavbarNav>

			<MDBNavbarToggler onClick={toggleCollapse("navbarCollapse1")} />
			<MDBCollapse id='navbarCollapse1' isOpen={collapseID} navbar>
				<MDBNavbarNav right>
					<MDBNavItem>
						<MDBFormInline
							onSubmit={(event) => {
								event.preventDefault();
								history.push("/search/" + document.getElementById("searchInput").value);
								return false;
							}}>
							<div className='md-form my-0'>
								<input className='form-control mr-sm-2' type='text' placeholder='Найти' aria-label='Найти' id='searchInput' />
							</div>
						</MDBFormInline>
					</MDBNavItem>

					<MDBNavItem className='font-weight-bold' hidden={loggedIn}>
						<MDBNavLink to='#' onClick={openLoginForm}>
							<MDBIcon icon='sign-in-alt' /> Войти
						</MDBNavLink>
					</MDBNavItem>
					<MDBNavItem className='font-weight-bold' hidden={loggedIn}>
						<MDBNavLink to='#' onClick={openRegistrateForm}>
							<MDBIcon icon='user-plus' /> Зарегистрироваться
						</MDBNavLink>
					</MDBNavItem>
					<MDBNavItem hidden={!loggedIn} className='font-weight-bold'>
						<MDBDropdown>
							<MDBDropdownToggle nav caret>
								<span className='mr-2'>{user.username}</span>
							</MDBDropdownToggle>
							<MDBDropdownMenu>
								<MDBDropdownItem>
									<a
										href={`/user/${user.id}`}
										className='navDropdownItem'
										onClick={(event) => {
											event.preventDefault();
											history.push(`/user/${user.id}`);
											return false;
										}}>
										<MDBIcon icon='user-circle' /> Профиль
									</a>
								</MDBDropdownItem>
								<MDBDropdownItem>
									<a
										href={`/calendar`}
										className='navDropdownItem'
										onClick={(event) => {
											event.preventDefault();
											history.push(`/calendar`);
											return false;
										}}>
										<MDBIcon icon='calendar-day' /> Календарь
									</a>
								</MDBDropdownItem>
								<MDBDropdownItem>
									<a
										href={`/unwatched`}
										className='navDropdownItem'
										onClick={(event) => {
											event.preventDefault();
											history.push(`/unwatched`);
											return false;
										}}>
										<MDBIcon icon='tv' /> Непросмотренное
									</a>
								</MDBDropdownItem>
								<MDBDropdownItem>
									<a
										href={`/settings`}
										className='navDropdownItem'
										onClick={(event) => {
											event.preventDefault();
											history.push(`/settings`);
											return false;
										}}>
										<MDBIcon icon='cog' /> Настройки
									</a>
								</MDBDropdownItem>
								<MDBDropdownItem onClick={resetAuthorization}>
									<a className='navDropdownItem' href='/' onClick={(event) => event.preventDefault()}>
										<MDBIcon icon='sign-out-alt' /> Выйти
									</a>
								</MDBDropdownItem>
							</MDBDropdownMenu>
						</MDBDropdown>
					</MDBNavItem>
				</MDBNavbarNav>
			</MDBCollapse>
		</MDBNavbar>
	);
});

export default Navbar;
