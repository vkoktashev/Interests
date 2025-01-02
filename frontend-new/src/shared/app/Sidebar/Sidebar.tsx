import React, {useCallback} from 'react';
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
	SidebarFooter,
} from 'react-pro-sidebar';

import useWindowDimensions from '../../../hooks/useWindowDimensions';

import './sidebar.scss';
import {useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {collapseSidebar, openLoginForm, openRegistrationForm, toggleSidebar} from '../../../actions/modals';
import {getSidebarIsCollapsed, getSidebarIsOpen} from '../../../reducers/modals';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_CALENDAR, ROUTE_RANDOMIZER, ROUTE_SETTINGS, ROUTE_UNWATCHED, ROUTE_USER} from '../../../routes';
import 'react-pro-sidebar/dist/css/styles.css';

/**
 * Основная страница приложения
 */
export function Sidebar() {
	const dispatch = useDispatch();
	const { width } = useWindowDimensions();
	const user = useSelector(getUser);
	const sidebarIsCollapsed = useSelector(getSidebarIsCollapsed);
	const sidebarIsToggled = useSelector(getSidebarIsOpen);

	const logout = useCallback(() => {
		dispatch(logout());
	}, []);

	function toggleSidebarIfSmallScreen() {
		if (width < 1780 && width > 1440 && !sidebarIsCollapsed) {
			dispatch(collapseSidebar());
		}
		if (width <= 1440) {
			dispatch(toggleSidebar());
		}
	}

	return (
		<ProSidebar className='sidebar' collapsed={sidebarIsCollapsed} hidden={!sidebarIsToggled}>
			<Menu iconShape='round' hidden={!user}>
				<MenuItem icon={<FaUserCircle />}>
					<a
						href={`/user/${user?.id}`}
						onClick={(event) => {
							event.preventDefault();
							dispatch(goToRoute(ROUTE_USER, {
								userId: user?.id,
							}));
							toggleSidebarIfSmallScreen();
						}}>
						Профиль
					</a>
				</MenuItem>
				<MenuItem icon={<FaUserFriends />}>
					<a
						href={`/user/${user?.id}?сategory=Друзья`}
						onClick={(event) => {
							event.preventDefault();
							dispatch(goToRoute(ROUTE_USER, {
								userId: user?.id,
								сategory: 'Друзья',
							}));
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
							dispatch(goToRoute(ROUTE_UNWATCHED));
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
							dispatch(goToRoute(ROUTE_CALENDAR));
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
							dispatch(goToRoute(ROUTE_RANDOMIZER));
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
							dispatch(goToRoute(ROUTE_SETTINGS));
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
							logout();
						}}>
						Выход
					</a>
				</MenuItem>
			</Menu>
			<Menu iconShape='round' hidden={user}>
				<MenuItem icon={<FaSignInAlt />}>
					<a
						href={`/`}
						onClick={(event) => {
							event.preventDefault();
							dispatch(openLoginForm());
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
							dispatch(openRegistrationForm());
							toggleSidebarIfSmallScreen();
						}}>
						Зарегистрироваться
					</a>
				</MenuItem>
			</Menu>
			<SidebarFooter>
				<Menu iconShape='round'>
					<MenuItem
						icon={sidebarIsCollapsed ? <FaArrowRight /> : <FaArrowLeft />}
						onClick={() => {
							dispatch(collapseSidebar());
						}}>
						Свернуть
					</MenuItem>
				</Menu>
			</SidebarFooter>
		</ProSidebar>
	);
}

export default Sidebar;
