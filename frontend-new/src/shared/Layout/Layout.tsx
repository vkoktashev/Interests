import * as React from 'react';

import {useBem, useComponents, useTheme} from '@steroidsjs/core/hooks';
import useLayout, {STATUS_OK, STATUS_LOADING} from '@steroidsjs/core/hooks/useLayout';

import {Notifications} from '@steroidsjs/core/ui/layout';
import Portal from '@steroidsjs/core/ui/layout/Portal';
import ModalPortal from '@steroidsjs/core/ui/modal/ModalPortal';

import './Layout.scss';
import Footer from '../app/Footer';
import Navbar from '../app/Navbar';
import Sidebar from '../app/Sidebar';
import {QueryParamProvider} from 'use-query-params';
import {ReactRouter5Adapter} from 'use-query-params/adapters/react-router-5';

export default function Layout(props: React.PropsWithChildren<any>) {
    const bem = useBem('Layout');
    const {http} = useComponents();
    const {setTheme} = useTheme();

    setTheme('dark');

    const components = useComponents();

    const {status, data} = useLayout(() => components.http.post('/init'));

    if (status !== STATUS_OK) {
        return status !== STATUS_LOADING ? status : null;
    }

    return (
        <div className={bem.block()}>
            <ModalPortal />
            <Navbar className={bem.element('header')} />
            <Sidebar className={bem.element('sidebar')} />
            <QueryParamProvider adapter={ReactRouter5Adapter}>
                <div className={bem.element('content')}>
                    <Notifications />
                        {props.children}
                    {
                        process.env.IS_SSR
                            ? null
                            : <Portal />
                    }
                </div>
            </QueryParamProvider>
            <Footer className={bem.element('footer')} />
        </div>
    );
}
