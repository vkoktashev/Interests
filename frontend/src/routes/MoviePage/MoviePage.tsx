import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import './MoviePage.scss';

interface IMoviePageProps {
    className?: string,
}

function MoviePage(props: IMoviePageProps) {
    const bem = useBem('MoviePage');

    return (
        <div className={bem(bem.block(), props.className)}>
        </div>
    );
}

export default MoviePage;
