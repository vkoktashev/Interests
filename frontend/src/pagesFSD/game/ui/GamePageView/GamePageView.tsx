"use client";
import React from 'react';
import {theme} from 'antd';
import {IGame} from '@/entities/game/model/interfaces';
import {GameHeader} from '@/features/game';
import styled from 'styled-components';
import {GlobalToken} from 'antd/es/theme/interface';

interface IGamePageView {
    game: IGame,
}

const StyledMain = styled.main<{$token: GlobalToken}>`
    position: relative;
    background-color: ${props => props.$token.colorBgContainer};
    max-width: 1200px;
    margin: 30px auto;
    overflow: hidden;
    border-radius: ${props => props.$token.borderRadiusLG}px;
`;

const StyledOverview = styled.div<{$token: GlobalToken}>`
    padding: ${props => props.$token.paddingLG}px;
`;


function GamePageView(props: IGamePageView) {
    const {token} = theme.useToken();
    const {game} = props;

    return (
        <StyledMain $token={token}>
            <GameHeader game={game} />
            <StyledOverview
                $token={token}
                dangerouslySetInnerHTML={{__html: game.overview}}
            />
        </StyledMain>
    );
}

export default GamePageView;
