import React from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../../store/AuthStore";
import PagesStore from "../../store/PagesStore";
import { MDBIcon } from "mdbreact";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import "./sidebar.sass";

import {
	ProSidebar,
	Menu,
	MenuItem,
	//SubMenu,
	SidebarFooter,
} from "react-pro-sidebar";
//import "react-pro-sidebar/dist/css/styles.css";

/**
 * Основная страница приложения
 */
const Sidebar = observer((props) => {
	const history = useHistory();
	const { width } = useWindowDimensions();

	const { loggedIn, user, resetAuthorization } = AuthStore;
	const { sidebarIsCollapsed, sidebarIsToggled, collapseSidebar, toggleSidebar, openLoginForm, openRegistrateForm } = PagesStore;

	function toggleSidebarIfSmallScreen() {
		if (width < 1780 && width > 1440 && !sidebarIsCollapsed) collapseSidebar();
		if (width <= 1440) toggleSidebar();
	}

	return (
		<ProSidebar className='sidebar' collapsed={sidebarIsCollapsed} hidden={!sidebarIsToggled}>
			<Menu iconShape='round' hidden={!loggedIn}>
				<MenuItem icon={<MDBIcon icon='user-circle' />}>
					<a
						href={`/user/${user?.id}`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/user/${user?.id}`);
							toggleSidebarIfSmallScreen();
						}}>
						Профиль
					</a>
				</MenuItem>
				<MenuItem icon={<MDBIcon icon='user-friends' />}>
					<a
						href={`/user/${user.id}/Друзья`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/user/${user?.id}/Друзья`);
							toggleSidebarIfSmallScreen();
						}}>
						Друзья
					</a>
				</MenuItem>

				<MenuItem icon={<MDBIcon icon='tv' />}>
					<a
						href={`/unwatched`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/unwatched`);
							toggleSidebarIfSmallScreen();
						}}>
						Непросмотренное
					</a>
				</MenuItem>
				<MenuItem icon={<MDBIcon icon='calendar-day' />}>
					<a
						href={`/calendar`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/calendar`);
							toggleSidebarIfSmallScreen();
						}}>
						Календарь
					</a>
				</MenuItem>
				<MenuItem icon={<MDBIcon icon='cog' />}>
					<a
						href={`/settings`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/settings`);
							toggleSidebarIfSmallScreen();
						}}>
						Настройки
					</a>
				</MenuItem>
				<MenuItem icon={<MDBIcon icon='sign-out-alt' />}>
					<a
						href={`/`}
						onClick={(event) => {
							event.preventDefault();
							resetAuthorization();
						}}>
						Выход
					</a>
				</MenuItem>
			</Menu>
			<Menu iconShape='round' hidden={loggedIn}>
				<MenuItem icon={<MDBIcon icon='sign-in-alt' />}>
					<a
						href={`/`}
						onClick={(event) => {
							event.preventDefault();
							openLoginForm();
							toggleSidebarIfSmallScreen();
						}}>
						Войти
					</a>
				</MenuItem>
				<MenuItem icon={<MDBIcon icon='user-plus' />}>
					<a
						href={`/`}
						onClick={(event) => {
							event.preventDefault();
							openRegistrateForm();
							toggleSidebarIfSmallScreen();
						}}>
						Зарегистрироваться
					</a>
				</MenuItem>
			</Menu>
			<SidebarFooter>
				<Menu iconShape='round'>
					<MenuItem icon={sidebarIsCollapsed ? <MDBIcon icon='arrow-right' /> : <MDBIcon icon='arrow-left' />} onClick={collapseSidebar}>
						Свернуть
					</MenuItem>
				</Menu>
			</SidebarFooter>
		</ProSidebar>
	);
});

export default Sidebar;
