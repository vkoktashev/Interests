"use client";
import React from 'react';
import SearchAutocomplete from '@/features/search/ui/SearchAutocomplete/SearchAutocomplete';
import {theme, Layout} from 'antd';
import Typography from 'antd/es/typography';
import styled from 'styled-components';
import Link from 'next/link';

const {Header: BaseHeader} = Layout;

const {useToken} = theme;

const HeaderDiv = styled.div`
    min-width: 100px;
`

function Header() {
    const { token } = useToken();

    return (
        <BaseHeader
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: token.colorBgBase,
                padding: token.padding
            }}
        >
            <HeaderDiv>
                <Link href={'/'}>
                    <Typography.Title level={2} style={{margin: 0}}>
                        Interests
                    </Typography.Title>
                </Link>
            </HeaderDiv>
            <SearchAutocomplete />
            <HeaderDiv>

            </HeaderDiv>
        </BaseHeader>
    );
}

export default Header;
