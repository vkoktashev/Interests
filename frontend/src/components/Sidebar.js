import React from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../store/AuthStore";
import PagesStore from "../store/PagesStore";
import { MDBIcon } from "mdbreact";

import { ProSidebar, Menu, MenuItem, SubMenu, SidebarFooter } from "react-pro-sidebar";
import "react-pro-sidebar/dist/css/styles.css";

/**
 * Основная страница приложения
 */
const Sidebar = observer((props) => {
	let history = useHistory();

	const { loggedIn, user } = AuthStore;
	const { sidebarIsOpen } = PagesStore;

	return (
		<ProSidebar className='sideNav' hidden={!sidebarIsOpen}>
			<Menu iconShape='square'>
				<MenuItem>
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
				</MenuItem>
				<MenuItem>
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
				</MenuItem>
				<MenuItem>
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
				</MenuItem>
				<MenuItem>
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
				</MenuItem>
				<SubMenu title='Components'>
					<MenuItem>Component 1</MenuItem>
					<MenuItem>Component 2</MenuItem>
				</SubMenu>
			</Menu>
			<SidebarFooter></SidebarFooter>
		</ProSidebar>
	);
});

export default Sidebar;
