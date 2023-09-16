import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import './ShowPage.scss';

interface IShowPageProps {
    className?: string,
}

function ShowPage(props: IShowPageProps) {
    const bem = useBem('ShowPage');

    return (
        <div className={bem(bem.block(), props.className)}>
        </div>
    );
}

export default ShowPage;
