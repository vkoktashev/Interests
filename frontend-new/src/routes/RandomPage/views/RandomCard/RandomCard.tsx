import * as React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../../index';
import './RandomCard.scss';

interface IRandomCardProps {
    className?: string,
    winner: any,
}

function RandomCard(props: IRandomCardProps) {
    const bem = useBem('RandomCard');
    const {winner} = props;

    const getRoute = (item: any) => {
        switch (item.type) {
            case 'game':
                return ROUTE_GAME;
            case 'movie':
                return ROUTE_MOVIE;
            case 'show':
                return ROUTE_SHOW;
        }
    }

    const getRouteParams = (item: any) => {
        switch (item.type) {
            case 'game':
                return {
                    gameId: item.rawg_slug,
                };
            case 'movie':
                return {
                    movieId: item.tmdb_id,
                };
            case 'show':
                return {
                    showId: item.tmdb_id,
                };
        }
    }

    return (
        <div className={bem(bem.block(), props.className)}>
            <img
                src={winner?.tmdb_poster_path || winner?.rawg_poster_path}
                className={bem.element('poster')}
                alt='poster'
            />
            <div>
                <Link
                    toRoute={getRoute(props.winner)}
                    toRouteParams={getRouteParams(props.winner)}
                    className={bem.element('link')}
                >
                    {winner.tmdb_name || winner.rawg_name}
                </Link>
            </div>
        </div>
    );
}

export default RandomCard;
