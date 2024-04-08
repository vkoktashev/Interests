"use client";
import React from 'react';
import styled from 'styled-components';
import {theme} from 'antd';

interface ISearchAutocompleteCategoryProps {
    title: string,
    icon: React.FC,
}

const {useToken} = theme;

const StyledSpan = styled.span`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
`;

const StyledIcon = styled.span<{ fill: string }>`
    width: 20px;
  
    svg {
      fill: ${props => props.fill};
    }
`;

function SearchAutocompleteCategory(props: ISearchAutocompleteCategoryProps) {
    const {token} = useToken();

    return (
        <StyledSpan>
            {props.title}
            <StyledIcon fill={token.colorText}>
                <props.icon />
            </StyledIcon>
        </StyledSpan>
    );
}

export default SearchAutocompleteCategory;
