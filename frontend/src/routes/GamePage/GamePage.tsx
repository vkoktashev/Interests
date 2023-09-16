import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import './GamePage.scss';

interface IGamePageProps {
    className?: string,
}

function GamePage(props: IGamePageProps) {
    const bem = useBem('GamePage');

    return (
        <div className={bem(bem.block(), props.className)}>
        </div>
    );
}

export default GamePage;
