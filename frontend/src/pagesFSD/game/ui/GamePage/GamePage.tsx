import React from 'react';
import {getGame} from '@/entities/game/api/requests';
import GamePageView from '../GamePageView';

async function GamePage(props: any) {
    const game = await getGame(props.params.slug);

    return (
        <GamePageView game={game} />
    );
}

export default GamePage;
