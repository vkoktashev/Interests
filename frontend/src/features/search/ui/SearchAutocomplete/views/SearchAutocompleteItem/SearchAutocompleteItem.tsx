import React from 'react';
import {theme} from 'antd';
import Link from 'next/link';
import Typography from 'antd/es/typography';
import styled from 'styled-components';

interface ISearchAutocompleteItemProps {
    style?: string,
    title: string,
    year: number | null,
    link: string,
}

const {useToken} = theme;

const StyledLink = styled(Link)`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
`;

function SearchAutocompleteItem(props: ISearchAutocompleteItemProps) {
    const {token} = useToken();

    return (
        <StyledLink href={props.link}>
            <Typography.Text style={{color: token.colorText}}>
                {props.title}
            </Typography.Text>
            <Typography.Text>
                {props.year}
            </Typography.Text>
        </StyledLink>
    );
}

export default SearchAutocompleteItem;
