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
	FaRandom,
	FaTimes,
} from 'react-icons/fa';
import {MdLiveTv, MdSettings} from 'react-icons/md';
import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import {logout} from '@steroidsjs/core/actions/auth';

import useWindowDimensions from '../../../hooks/useWindowDimensions';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {collapseSidebar, toggleSidebar} from '../../../actions/modals';
import {getSidebarIsCollapsed, getSidebarIsOpen} from '../../../reducers/modals';
import {goToRouteWithParams} from '../../../actions/router';
import {
	ROUTE_CALENDAR,
	ROUTE_RANDOMIZER,
	ROUTE_SETTINGS,
	ROUTE_UNWATCHED,
	ROUTE_USER,
} from '../../../routes';
import LoginForm from '../../../modals/LoginForm';
import RegisterForm from '../../../modals/RegisterForm';
import './sidebar.scss';

interface ISidebarAction {
	key: string;
	title: string;
	icon: React.ReactNode;
	onClick?: () => void;
	href?: string;
	accent?: boolean;
}

const MOBILE_BREAKPOINT = 540;

export function Sidebar(props: {className?: string}) {
	const bem = useBem('sidebar');
	const dispatch = useDispatch();
	const {width} = useWindowDimensions();
	const user = useSelector(getUser);
	const sidebarIsCollapsed = useSelector(getSidebarIsCollapsed);
	const sidebarIsOpen = useSelector(getSidebarIsOpen);
	const isMobile = width <= MOBILE_BREAKPOINT;

	const closeSidebarOnMobile = useCallback(() => {
		if (isMobile) {
			dispatch(toggleSidebar());
		}
	}, [dispatch, isMobile]);

	const openProfile = useCallback(() => {
		dispatch(goToRoute(ROUTE_USER, {userId: user?.id}));
		closeSidebarOnMobile();
	}, [closeSidebarOnMobile, dispatch, user?.id]);

	const openFriends = useCallback(() => {
		dispatch(goToRouteWithParams(ROUTE_USER, {
			userId: user?.id,
			сategory: 'Друзья',
		}));
		closeSidebarOnMobile();
	}, [closeSidebarOnMobile, dispatch, user?.id]);

	const openRoute = useCallback((route: string) => {
		dispatch(goToRoute(route));
		closeSidebarOnMobile();
	}, [closeSidebarOnMobile, dispatch]);

	const logoutAction = useCallback(() => {
		dispatch(logout());
		closeSidebarOnMobile();
	}, [closeSidebarOnMobile, dispatch]);

	const openLogin = useCallback(() => {
		dispatch(openModal(LoginForm));
		closeSidebarOnMobile();
	}, [closeSidebarOnMobile, dispatch]);

	const openRegister = useCallback(() => {
		dispatch(openModal(RegisterForm));
		closeSidebarOnMobile();
	}, [closeSidebarOnMobile, dispatch]);

	const handleCollapseAction = useCallback(() => {
		if (isMobile) {
			dispatch(toggleSidebar());
			return;
		}
		dispatch(collapseSidebar());
	}, [dispatch, isMobile]);

	const authenticatedActions: ISidebarAction[] = [
		{key: 'profile', title: 'Профиль', icon: <FaUserCircle />, onClick: openProfile, href: `/user/${user?.id || ''}`},
		{
			key: 'friends',
			title: 'Друзья',
			icon: <FaUserFriends />,
			onClick: openFriends,
			href: `/user/${user?.id || ''}?${new URLSearchParams({сategory: 'Друзья'} as any).toString()}`,
		},
		{key: 'unwatched', title: 'Непросмотренное', icon: <MdLiveTv />, onClick: () => openRoute(ROUTE_UNWATCHED), href: '/unwatched'},
		{key: 'calendar', title: 'Календарь', icon: <FaCalendar />, onClick: () => openRoute(ROUTE_CALENDAR), href: '/calendar'},
		{key: 'randomizer', title: 'Рандомайзер', icon: <FaRandom />, onClick: () => openRoute(ROUTE_RANDOMIZER), href: '/random'},
		{key: 'settings', title: 'Настройки', icon: <MdSettings />, onClick: () => openRoute(ROUTE_SETTINGS), href: '/settings'},
		{key: 'logout', title: 'Выход', icon: <FaSignOutAlt />, onClick: logoutAction, accent: true},
	];

	const guestActions: ISidebarAction[] = [
		{key: 'login', title: 'Войти', icon: <FaSignInAlt />, onClick: openLogin},
		{key: 'register', title: 'Зарегистрироваться', icon: <FaUserPlus />, onClick: openRegister},
	];

	const sidebarClassName = [
		bem.block(),
		props.className,
		sidebarIsCollapsed ? 'sidebar_collapsed' : '',
		sidebarIsOpen ? 'sidebar_open' : '',
		isMobile ? 'sidebar_mobile' : '',
	].filter(Boolean).join(' ');

	return (
		<>
			{isMobile && sidebarIsOpen && (
				<button
					type='button'
					className={bem.element('overlay')}
					onClick={() => dispatch(toggleSidebar())}
					aria-label='Закрыть боковое меню'
				/>
			)}

			<aside
				className={sidebarClassName}
			>
				<div className={bem.element('panel')}>
					<nav className={bem.element('menu')} aria-label='Основная навигация'>
						{(user ? authenticatedActions : guestActions).map(action => {
							if (action.href) {
								return (
									<a
										key={action.key}
										href={action.href}
										className={bem.element('item', {accent: action.accent})}
										onClick={(e) => {
											if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
												return;
											}
											e.preventDefault();
											action.onClick?.();
										}}
										title={sidebarIsCollapsed ? action.title : undefined}
									>
										<span className={bem.element('item-icon')}>{action.icon}</span>
										<span className={bem.element('item-title')}>{action.title}</span>
									</a>
								);
							}

							return (
								<button
									type='button'
									key={action.key}
									className={bem.element('item', {accent: action.accent})}
									onClick={action.onClick}
									title={sidebarIsCollapsed ? action.title : undefined}
								>
									<span className={bem.element('item-icon')}>{action.icon}</span>
									<span className={bem.element('item-title')}>{action.title}</span>
								</button>
							);
						})}
					</nav>

					<div className={bem.element('footer')}>
						<button
							type='button'
							className={bem.element('collapse')}
							onClick={handleCollapseAction}
							title={isMobile ? 'Закрыть меню' : (sidebarIsCollapsed ? 'Развернуть' : 'Свернуть')}
						>
							<span className={bem.element('item-icon')}>
								{isMobile ? <FaTimes /> : (sidebarIsCollapsed ? <FaArrowRight /> : <FaArrowLeft />)}
							</span>
							<span className={bem.element('item-title')}>
								{isMobile ? 'Закрыть меню' : (sidebarIsCollapsed ? 'Развернуть' : 'Свернуть')}
							</span>
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}

export default Sidebar;
