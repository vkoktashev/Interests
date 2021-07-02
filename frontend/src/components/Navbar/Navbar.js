import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import PagesStore from "../../store/PagesStore";
import AuthStore from "../../store/AuthStore";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import SearchInput from "../Common/SearchInput/SearchInput";
import classnames from "classnames";

import { MDBIcon } from "mdbreact";
import "./navbar.sass";

const Navbar = observer((props) => {
	const { toggleSidebar, openLoginForm } = PagesStore;
	const { width } = useWindowDimensions();
	const { loggedIn, user } = AuthStore;

	let history = useHistory();

	const [collapse, setCollapse] = useState(true);

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	function toggleIfSmallScreen() {
		if (width <= 600) setCollapse(true);
	}

	return (
		<div className='navbar'>
			<div className='navbar__left'>
				<div onClick={toggleSidebar} className='navbar__sidebar-button'>
					<MDBIcon icon='bars' />
				</div>
				<div onClick={() => history.push("/")} className='navbar__logo'>
					Interests
				</div>
				<div onClick={toggleCollapse} className='navbar__collapse-button'>
					{collapse ? <MDBIcon icon='angle-down' /> : <MDBIcon icon='angle-up' />}
				</div>
			</div>
			<div className={classnames("navbar__center", collapse && width <= 600 ? "navbar__center_collapsed" : "")}>
				<SearchInput
					onSubmit={(event) => {
						event.preventDefault();
						history.push("/search/" + document.getElementById("searchInput").value);
						toggleIfSmallScreen();
					}}
					className='navbar__search-input'
				/>
			</div>
			<div className={classnames("navbar__right", collapse && width <= 600 ? "navbar__right_collapsed" : "")}>
				<div
					onClick={() => {
						history.push(`/user/${user.id}`);
						toggleIfSmallScreen();
					}}
					className='navbar__user-button'
					hidden={!loggedIn}>
					<MDBIcon icon='user-circle' /> {user.username}
				</div>
				<div onClick={openLoginForm} className='navbar__user-button' hidden={loggedIn}>
					<MDBIcon icon='sign-in-alt' /> Войти
				</div>
			</div>
		</div>
	);
});

export default Navbar;
