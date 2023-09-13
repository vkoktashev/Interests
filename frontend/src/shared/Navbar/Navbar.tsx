import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import {useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {useCallback, useState} from 'react';
import {FaAngleDown, FaAngleUp, FaBars, FaSignInAlt, FaUserCircle} from 'react-icons/fa';
import './Navbar.scss';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_ROOT} from '../../routes';
import {MOBILE_WIDTH} from '../../constants';
import {openModal} from '@steroidsjs/core/actions/modal';
import LoginModal from '../../modals/LoginModal';

interface INavbarProps {
    className?: string,
}

function Navbar(props: INavbarProps) {
    const bem = useBem('Navbar');
    // const { toggleSidebar, openLoginForm } = PagesStore;
    const { width } = useWindowDimensions();
    const dispatch = useDispatch();
    const user = useSelector(state => getUser(state));

    const [collapse, setCollapse] = useState(true);

    const toggleCollapse = () => {
        setCollapse(!collapse);
    };

    function toggleIfSmallScreen() {
        if (width <= 600) setCollapse(true);
    }

    const onLogoClick = useCallback(() => dispatch(goToRoute(ROUTE_ROOT)), []);

    const openLoginForm = useCallback(() => {
        dispatch(openModal(LoginModal));
    }, []);

    const toggleSidebar = useCallback(() => {}, []);

    return (
        <div className={bem(bem.block(), props.className)}>
            <div className={bem.element('leftSide')}>
                <div className={bem.element('logoContainer')}>
                    <FaBars
                        onClick={toggleSidebar}
                        className={bem.element('sidebar-button')}
                    />
                    <div onClick={onLogoClick} className={bem.element('logo')}>
                        HypeHub
                    </div>
                </div>
                <div onClick={toggleCollapse} className={bem.element('collapse-button')}>
                    {collapse ? <FaAngleDown /> : <FaAngleUp />}
                </div>
            </div>
            <div className={bem.element('centerSide', {collapsed: collapse && width <= MOBILE_WIDTH})}>
                {/*<SearchInput*/}
                {/*    onSubmit={(event) => {*/}
                {/*        event.preventDefault();*/}
                {/*        history.push('/search/' + document.getElementById('searchInput').value);*/}
                {/*        toggleIfSmallScreen();*/}
                {/*    }}*/}
                {/*    className='navbar__search-input'*/}
                {/*/>*/}
            </div>
            <div className={bem.element('rightSide', {collapsed: collapse && width <= MOBILE_WIDTH})}>
                <div
                    onClick={() => {
                        toggleIfSmallScreen();
                    }}
                    className={bem.element('user-button', {hidden: !user})} >
                    <FaUserCircle /> {user?.username}
                </div>
                <div
                    onClick={openLoginForm}
                    className={bem.element('user-button', {hidden: !!user})}
                >
                    <FaSignInAlt className={bem.element('loginIcon')} /> Войти
                </div>
            </div>
        </div>
    );
}

export default Navbar;
