import React from 'react';
import { useHistory } from 'react-router-dom';
import { observer } from 'mobx-react';
import {
	FaSignInAlt,
	FaUserCircle,
	FaUserFriends,
	FaCalendar,
	FaSignOutAlt,
	FaUserPlus,
	FaArrowRight,
	FaArrowLeft,
	FaRandom
} from 'react-icons/fa';
import { MdLiveTv, MdSettings } from 'react-icons/md';
import {
	ProSidebar,
	Menu,
	MenuItem,
	//SubMenu,
	SidebarFooter,
} from 'react-pro-sidebar';

import AuthStore from '../../../store/AuthStore';
import PagesStore from '../../../store/PagesStore';
import useWindowDimensions from '../../../hooks/useWindowDimensions';

import './sidebar.sass';
//import 'react-pro-sidebar/dist/css/styles.css';

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
				<MenuItem icon={<FaUserCircle />}>
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
				<MenuItem icon={<FaUserFriends />}>
					<a
						href={`/user/${user.id}?сategory=Друзья`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/user/${user?.id}?сategory=Друзья`);
							toggleSidebarIfSmallScreen();
						}}>
						Друзья
					</a>
				</MenuItem>

				<MenuItem icon={<MdLiveTv />}>
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
				<MenuItem icon={<FaCalendar />}>
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
				<MenuItem icon={<FaRandom />}>
					<a
						href={`/random`}
						onClick={(event) => {
							event.preventDefault();
							history.push(`/random`);
							toggleSidebarIfSmallScreen();
						}}>
						Рандомайзер
					</a>
				</MenuItem>
				<MenuItem icon={<MdSettings />}>
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
				<MenuItem icon={<FaSignOutAlt />}>
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
				<MenuItem icon={<FaSignInAlt />}>
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
				<MenuItem icon={<FaUserPlus />}>
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
					<MenuItem icon={sidebarIsCollapsed ? <FaArrowRight /> : <FaArrowLeft />} onClick={collapseSidebar}>
						Свернуть
					</MenuItem>
				</Menu>
			</SidebarFooter>
		</ProSidebar>
	);
});

export default Sidebar;
