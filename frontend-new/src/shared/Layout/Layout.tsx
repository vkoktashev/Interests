import * as React from 'react';

import {useBem, useComponents, useSelector, useTheme} from '@steroidsjs/core/hooks';
import useLayout, {STATUS_OK, STATUS_LOADING} from '@steroidsjs/core/hooks/useLayout';
import {getRoute, getRouteParams} from '@steroidsjs/core/reducers/router';

import {Notifications} from '@steroidsjs/core/ui/layout';
import Portal from '@steroidsjs/core/ui/layout/Portal';
import ModalPortal from '@steroidsjs/core/ui/modal/ModalPortal';

import './Layout.scss';
import Footer from '../app/Footer';
import Navbar from '../app/Navbar';
import Sidebar from '../app/Sidebar';
import {QueryParamProvider} from 'use-query-params';
import {ReactRouter5Adapter} from 'use-query-params/adapters/react-router-5';

const APP_TITLE = 'Interests';
const ROUTE_SEARCH = 'search';

function decodeTitleParam(value: unknown): string {
    if (!value) {
        return '';
    }

    const rawValue = String(value).replace(/\+/g, ' ');
    try {
        return decodeURIComponent(rawValue).trim();
    } catch {
        return rawValue.trim();
    }
}

function withAppTitle(title: string): string {
    if (!title || title === APP_TITLE || title.includes(APP_TITLE)) {
        return title || APP_TITLE;
    }

    return `${title} - ${APP_TITLE}`;
}

function getDocumentTitle(route: any, routeParams: Record<string, unknown>): string {
    const routeTitle = String(route?.title || APP_TITLE).trim();

    if (route?.id === ROUTE_SEARCH) {
        const query = decodeTitleParam(routeParams?.query);
        if (query) {
            return `${query} - ${withAppTitle(routeTitle)}`;
        }
    }

    return withAppTitle(routeTitle);
}

export default function Layout(props: React.PropsWithChildren<any>) {
    const bem = useBem('Layout');
    const {http} = useComponents();
    const {setTheme} = useTheme();
    const route = useSelector(getRoute);
    const routeParams = useSelector(getRouteParams) || {};
    const routePathname = useSelector(state => state.router?.location?.pathname || '');
    const documentTitle = getDocumentTitle(route, routeParams);

    setTheme('dark');

    const components = useComponents();

    const {status, data} = useLayout(() => components.http.post('/init'));

    React.useEffect(() => {
        document.title = documentTitle;
    }, [documentTitle, routePathname]);

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
