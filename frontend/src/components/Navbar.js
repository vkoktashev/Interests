import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import PagesStore from "../store/PagesStore";
import AuthStore from "../store/AuthStore";

import { MDBIcon } from "mdbreact";

const Navbar = observer((props) => {
	const { toggleSidebar, openLoginForm } = PagesStore;
	const { width } = useWindowDimensions();
	const { loggedIn, user, resetAuthorization } = AuthStore;

	let history = useHistory();

	const [collapse, setCollapse] = useState(false);

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

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
				<form
					onSubmit={(event) => {
						event.preventDefault();
						history.push("/search/" + document.getElementById("searchInput").value);
						return false;
					}}>
					<div>
						<input type='text' placeholder='Поиск' aria-label='Поиск' id='searchInput' />
					</div>
				</form>
			</div>
			<div className={`navbarRight ${collapse && width <= 600 ? " collapsed" : ""}`}>
				<div onClick={() => history.push(`/user/${user.id}`)} className='navUserButton' hidden={!loggedIn}>
					<MDBIcon icon='user-circle' /> {user.username}
				</div>
				<div onClick={openLoginForm} className='navUserButton' hidden={loggedIn}>
					<MDBIcon icon='sign-in-alt' /> Войти
				</div>
			</div>
		</div>
	);
});

function getWindowDimensions() {
	const { innerWidth: width, innerHeight: height } = window;
	return {
		width,
		height,
	};
}

function useWindowDimensions() {
	const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

	useEffect(() => {
		function handleResize() {
			setWindowDimensions(getWindowDimensions());
		}

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return windowDimensions;
}

export default Navbar;
