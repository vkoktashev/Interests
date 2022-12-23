import * as React from 'react';
import {block} from 'bem-cn';
import {compact} from 'lodash';
import './RandomCard.scss';
import {useHistory} from 'react-router-dom';

interface IRandomCardProps {
    className?: string,
    winner: any,
}

function RandomCard(props: IRandomCardProps) {
    const bem = block('RandomCard');
    const history = useHistory();
    const {winner} = props;

    const getLink = (item: any) => {
        switch (item.type) {
            case 'game':
                return `/game/${item.rawg_slug}`;
            case 'movie':
                return `/movie/${item.tmdb_id}`;
            case 'show':
                return `/show/${item.tmdb_id}`;
        }
    }

    return (
        <div className={compact([bem(), props.className]).join(' ')}>
            <img
                src={winner?.tmdb_poster_path || winner?.rawg_poster_path}
                className={bem('poster')}
                alt='poster'
            />
            <div>
                <a
                    href={window.location.origin + getLink(winner)}
                    onClick={(e) => {
                        history.push(getLink(winner));
                        e.preventDefault();
                    }}
                    className={bem('link')}
                >
                    {winner.tmdb_name || winner.rawg_name}
                </a>
            </div>
        </div>
    );
}

export default RandomCard;
