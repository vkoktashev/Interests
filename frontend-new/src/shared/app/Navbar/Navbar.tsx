import React, {FormEvent, useCallback, useMemo, useState} from 'react';
import { FaBars, FaAngleUp, FaAngleDown, FaUserCircle, FaSignInAlt } from 'react-icons/fa';

import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SearchInput from './views/SearchInput';

import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {openModal} from '@steroidsjs/core/actions/modal';
import {Button} from '@steroidsjs/core/ui/form';
import LoginForm from '../../../modals/LoginForm';
import {ROUTE_ROOT, ROUTE_SEARCH, ROUTE_USER} from '../../../routes';
import {toggleSidebar} from '../../../actions/modals';
import './navbar.scss';
import {goToRouteWithParams} from '../../../actions/router';

const MOBILE_BREAKPOINT = 600;

export function Navbar(props: any) {
	const dispatch = useDispatch();
	const bem = useBem('navbar');
	const { width } = useWindowDimensions();
	const user = useSelector(getUser);
	const [isCollapsed, setCollapsed] = useState(true);
	const isMobile = useMemo(() => width <= MOBILE_BREAKPOINT, [width]);

	const toggleSidebarAction = useCallback(() => {
		dispatch(toggleSidebar());
	}, [dispatch]);

	const openLogin = useCallback(() => {
		dispatch(openModal(LoginForm, {}));
	}, [dispatch]);

	const toggleCollapse = useCallback(() => {
		setCollapsed(prev => !prev);
	}, []);

	const closeOnMobile = useCallback(() => {
		if (isMobile) {
			setCollapsed(true);
		}
	}, [isMobile]);

	const onSearchSubmit = useCallback((event: FormEvent, value: string) => {
		event.preventDefault();
		closeOnMobile();
		dispatch(goToRouteWithParams(ROUTE_SEARCH, {
			query: value,
		}));
	}, [closeOnMobile, dispatch]);

	const onUserClick = useCallback(() => {
		dispatch(goToRoute(ROUTE_USER, {
			userId: user?.id,
		}));
		closeOnMobile();
	}, [closeOnMobile, dispatch, user?.id]);

	const onTitleClick = useCallback(() => {
		dispatch(goToRoute(ROUTE_ROOT));
		closeOnMobile();
	}, [closeOnMobile, dispatch]);

	return (
		<div className={bem(bem.block(), props.className)}>
			<div className={bem.element('left')}>
				<button type='button' onClick={toggleSidebarAction} className={bem.element('sidebar-button')}>
					<FaBars />
				</button>
				<button type='button' onClick={onTitleClick} className={bem.element('title')}>
					Interests
				</button>
				<button type='button' onClick={toggleCollapse} className={bem.element('collapse-button')}>
					{isCollapsed ? <FaAngleDown /> : <FaAngleUp />}
				</button>
			</div>

			<div className={bem.element('center', {collapsed: isMobile && isCollapsed})}>
				<SearchInput
					onSubmit={onSearchSubmit}
					className={bem.element('search-input')}
				/>
			</div>

			<div className={bem.element('right', {collapsed: isMobile && isCollapsed})}>
				{user && (
					<button type='button' onClick={onUserClick} className={bem.element('user-button')}>
						<FaUserCircle /> {user?.username}
					</button>
				)}

				{!user && (
					<Button
						type='button'
						onClick={openLogin}
						className={bem.element('login-button')}
					>
						<FaSignInAlt /> {__('Войти')}
					</Button>
				)}
			</div>
		</div>
	);
}

export default Navbar;
