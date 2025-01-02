import * as React from 'react';

import {useBem} from '@steroidsjs/core/hooks';
import useLayout, {STATUS_OK, STATUS_LOADING} from '@steroidsjs/core/hooks/useLayout';

import {Notifications} from '@steroidsjs/core/ui/layout';
import Portal from '@steroidsjs/core/ui/layout/Portal';
import ModalPortal from '@steroidsjs/core/ui/modal/ModalPortal';

import './Layout.scss';
import Footer from '../app/Footer';
import Navbar from '../app/Navbar';
import Sidebar from '../app/Sidebar';

export default function Layout(props: React.PropsWithChildren<any>) {
    const bem = useBem('Layout');

    //const components = useComponents();
    const {status} = useLayout(/*() => components.http.post('/api/v1/init')*/);

    if (status !== STATUS_OK) {
        return status !== STATUS_LOADING ? status : null;
    }

    return (
        <div className={bem.block()}>
            <Navbar className={bem.element('header')} />
            <Sidebar />
            <div className={bem.element('content')}>
                <Notifications />
                {props.children}
                <ModalPortal />
                {
                    process.env.IS_SSR
                        ? null
                        : <Portal />
                }
            </div>
            <Footer className={bem.element('footer')} />
        </div>
    );
}
