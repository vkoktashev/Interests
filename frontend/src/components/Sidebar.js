import React from "react";
import { useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import AuthStore from "../store/AuthStore";
import PagesStore from "../store/PagesStore";
import { MDBIcon } from "mdbreact";

import { ProSidebar, Menu, MenuItem, SubMenu, SidebarFooter } from "react-pro-sidebar";
//import "react-pro-sidebar/dist/css/styles.css";

/**
 * Основная страница приложения
 */
const Sidebar = observer((props) => {
	let history = useHistory();

	const { loggedIn, user, resetAuthorization } = AuthStore;
	const { sidebarIsCollapsed, sidebarIsToggled, collapseSidebar, openLoginForm, openRegistrateForm } = PagesStore;

	return (
		<ProSidebar className='sideNav' collapsed={sidebarIsCollapsed} hidden={sidebarIsToggled}>
			<Menu iconShape='round' hidden={!loggedIn}>
				<MenuItem icon={<MDBIcon icon='user-circle' />}>
					<a
						href={`/user/${user.id}`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/user/${user.id}`);
							return false;
						}}>
						Профиль
					</a>
				</MenuItem>
				<MenuItem icon={<MDBIcon icon='user-friends' />}>
					<a
						href={`/user/${user.id}/Друзья`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/user/${user.id}/Друзья`);
							return false;
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
							return false;
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
							return false;
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
							return false;
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
