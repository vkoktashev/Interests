import React from 'react';
import styles from './Layout.module.scss';
import Header from '@/widgets/header/ui/Header';
import {Footer} from '@/widgets/footer';

interface ILayoutProps {
    className?: string,
    children: any,
}

function Layout(props: ILayoutProps) {
    return (
        <div className={[styles.Layout, props.className].join(' ')}>
            <Header />
            {props.children}
            <Footer />
        </div>
    );
}

export default Layout;
