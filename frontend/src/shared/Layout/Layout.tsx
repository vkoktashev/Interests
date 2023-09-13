import * as React from 'react';
import {useBem, useSelector} from '@steroidsjs/core/hooks';
import useLayout, {
    STATUS_OK,
    STATUS_LOADING,
    STATUS_NOT_FOUND,
    STATUS_ACCESS_DENIED
} from '@steroidsjs/core/hooks/useLayout';
import {getRouteProp} from '@steroidsjs/core/reducers/router';
import {Notifications} from '@steroidsjs/core/ui/layout';
import Header from '@steroidsjs/core/ui/layout/Header';
import {ROUTE_ROOT} from '../../routes';

import './Layout.scss';
import Footer from '../Footer';
import Navbar from '../Navbar';

export default function Layout(props: React.PropsWithChildren<any>) {
    const bem = useBem('Layout');

    //const components = useComponents();
    const {status}: any = useLayout(/*() => components.http.post('/api/v1/init')*/);
    const layout = useSelector(state => getRouteProp(state, null, 'layout') || 'default');

    if (status !== STATUS_OK) {
        return status !== STATUS_LOADING ? status : null;
    }

    return (
        <div className={bem.block()}>
            <Navbar />
            <div className={bem.element('content')}>
                {status === STATUS_NOT_FOUND && (
                    <div>
                        {__('404... 🤷‍')}
                    </div>
                )}
                {status === STATUS_ACCESS_DENIED && (
                    <div>
                        {__('Нет доступа')}
                    </div>
                )}
                {status === STATUS_OK && (
                    <div className={bem(bem.element('main-container', {layout}), 'container-fluid')}>
                        {props.children}
                    </div>
                )}
                <Notifications />
            </div>
            <Footer />
        </div>
    );
}
