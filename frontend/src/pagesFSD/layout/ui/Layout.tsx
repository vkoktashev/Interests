'use client';

import React from 'react';
import {Layout as AntLayout} from 'antd';
import {Header} from '@/widgets/header';
import {Footer} from '@/widgets/footer';
import {Sidebar} from '../../../widgets/sidebar';

const {Content} = AntLayout;

interface ILayoutProps {
    className?: string,
    children: any,
}

function Layout(props: ILayoutProps) {
    return (
        <AntLayout style={{height: '100%'}}>
            <Header />
            <AntLayout style={{
                display: 'flex',
                flexDirection: 'row',
                height: '100%',
            }}
            >
                <Sidebar />
                <Content style={{
                    overflow: 'scroll',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
                >
                    {props.children}
                    <Footer />
                </Content>
            </AntLayout>
        </AntLayout>
    );
}

export default Layout;
