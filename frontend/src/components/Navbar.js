import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import PagesStore from "../store/PagesStore";
import AuthStore from "../store/AuthStore";
import useWindowDimensions from "../hooks/useWindowDimensions";
import SearchInput from "../components/Common/SearchInput";

import { MDBIcon } from "mdbreact";

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
			<div className='navbarLeft'>
				<div onClick={toggleSidebar} className='sidebarButton'>
					<MDBIcon icon='bars' />
				</div>
				<div onClick={() => history.push("/")} className='navLogo'>
					Interests
				</div>
				<div onClick={toggleCollapse} className='collapseButton'>
					{collapse ? <MDBIcon icon='angle-down' /> : <MDBIcon icon='angle-up' />}
				</div>
			</div>
			<div className={`navbarCenter ${collapse && width <= 600 ? " collapsed" : ""}`}>
				<SearchInput
					onSubmit={(event) => {
						event.preventDefault();
						history.push("/search/" + document.getElementById("searchInput").value);
						toggleIfSmallScreen();
					}}
				/>
			</div>
			<div className={`navbarRight ${collapse && width <= 600 ? " collapsed" : ""}`}>
				<div
					onClick={() => {
						history.push(`/user/${user.id}`);
						toggleIfSmallScreen();
					}}
					className='navUserButton'
					hidden={!loggedIn}>
					<MDBIcon icon='user-circle' /> {user.username}
				</div>
				<div onClick={openLoginForm} className='navUserButton' hidden={loggedIn}>
					<MDBIcon icon='sign-in-alt' /> Войти
				</div>
			</div>
		</div>
	);
});

export default Navbar;
