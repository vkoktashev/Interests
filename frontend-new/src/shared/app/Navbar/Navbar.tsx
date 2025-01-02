import React, {useCallback, useState} from 'react';
import classnames from 'classnames';
import { FaBars, FaAngleUp, FaAngleDown, FaUserCircle, FaSignInAlt } from 'react-icons/fa';

import useWindowDimensions from '../../../hooks/useWindowDimensions';
import SearchInput from './views/SearchInput';

import './navbar.scss';
import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {openLoginForm, toggleSidebar} from '../../../actions/modals';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_ROOT, ROUTE_SEARCH, ROUTE_USER} from '../../../routes';
import {go} from 'connected-react-router';

export function Navbar(props: any) {
	const dispatch = useDispatch();
	const bem = useBem('navbar');
	const { width } = useWindowDimensions();
	const user = useSelector(getUser);
	const [collapse, setCollapse] = useState(true);

	const toggleSidebarAction = useCallback(() => {
		dispatch(toggleSidebar());
	}, []);

	const openLogin = useCallback(() => {
		dispatch(openLoginForm());
	}, []);


	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	function toggleIfSmallScreen() {
		if (width <= 600) {
			setCollapse(true);
		}
	}

	return (
		<div className={bem(bem.block(), props.className)}>
			<div className='navbar__left'>
				<FaBars onClick={toggleSidebarAction} className='navbar__sidebar-button' />
				<div onClick={() => dispatch(goToRoute(ROUTE_ROOT))} className='navbar__logo'>
					Interests
				</div>
				<div onClick={toggleCollapse} className='navbar__collapse-button'>
					{collapse ? <FaAngleDown /> : <FaAngleUp />}
				</div>
			</div>
			<div className={classnames('navbar__center', collapse && width <= 600 ? 'navbar__center_collapsed' : '')}>
				<SearchInput
					onSubmit={(event, value) => {
						event.preventDefault();
						toggleIfSmallScreen();
						dispatch(goToRoute(ROUTE_SEARCH, {
							query: value,
						}));
					}}
					className='navbar__search-input'
				/>
			</div>
			<div className={classnames('navbar__right', collapse && width <= 600 ? 'navbar__right_collapsed' : '')}>
				<div
					onClick={() => {
						dispatch(goToRoute(ROUTE_USER, {
							userId: user?.id,
						}))
						toggleIfSmallScreen();
					}}
					className='navbar__user-button'
					hidden={!user}>
					<FaUserCircle /> {user?.username}
				</div>
				<div onClick={openLogin} className='navbar__user-button' hidden={!!user}>
					<FaSignInAlt /> Войти
				</div>
			</div>
		</div>
	);
}

export default Navbar;
