import React from 'react';
import styles from './GamePage.module.scss';
import {getGame} from '@/entities/game/api/requests';

async function GamePage(props: any) {
    const game = await getGame(props.params.slug);

    return (
        <div className={styles.GamePage}>
            <h1>
                {game.name}
            </h1>
        </div>
    );
}

export default GamePage;
