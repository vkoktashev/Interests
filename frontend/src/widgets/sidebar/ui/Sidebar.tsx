'use client';

import React, {useMemo} from 'react';
import {theme, Menu, MenuProps} from 'antd';
import {useWindowSize} from 'react-use';
import UserIcon from '@/../public/icons/user.svg';
import UsersIcon from '@/../public/icons/user-group.svg';
import TVIcon from '@/../public/icons/tv.svg';
import CalendarIcon from '@/../public/icons/calendar.svg';
import DiceIcon from '@/../public/icons/dice.svg';
import GearIcon from '@/../public/icons/gear.svg';
import LogoutIcon from '@/../public/icons/logout.svg';

const {useToken} = theme;

type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: 'group',
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
        type,
    } as MenuItem;
}

function Sidebar() {
    const {token} = useToken();
    const {width} = useWindowSize();

    const iconStyle = useMemo(() => ({
        width: token.fontSizeLG,
        fill: token.colorText,
    }), [token]);

    const items: MenuProps['items'] = useMemo(() => [
        getItem('Профиль', 'profile', (<UserIcon style={iconStyle} />)),
        getItem('Друзья', 'friend', (<UsersIcon style={iconStyle} />)),
        getItem('Непросмотренное', 'unwatched', (<TVIcon style={iconStyle} />)),
        getItem('Календарь', 'calendar', (<CalendarIcon style={iconStyle} />)),
        getItem('Рандомайзер', 'randomizer', (<DiceIcon style={iconStyle} />)),
        getItem('Настройки', 'settings', (<GearIcon style={iconStyle} />)),
        {type: 'divider'},
        getItem('Выйти', 'logout', (<LogoutIcon style={iconStyle} />)),
    ],
    [token]);

    return (
        <Menu
            style={{
                width: width < 600 ? 50 : 220,
                backgroundColor: token.colorBgBase,
            }}
            mode="vertical"
            items={items}
            inlineCollapsed={width < 600}
        />
    );
}

export default Sidebar;
