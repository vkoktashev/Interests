import * as React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import {useCallback, useState} from 'react';
import {isEmpty as _isEmpty} from 'lodash';
import {MdLiveTv, MdLocalMovies, MdVideogameAsset} from 'react-icons/md';
import {Link} from '@steroidsjs/core/ui/nav';
import useFastSearchDataProvider from '../../../../hooks/useFastSearchDataProvider';
import './SearchField.scss';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../../../routes';


interface ISearchFieldViewProps {
    className?: string,
}

function SearchField(props: ISearchFieldViewProps) {
    const bem = useBem('SearchField');
    const [query, setQuery] = useState('');

    const items = useFastSearchDataProvider(query);

    const renderItems = () => (
        <>
            <div className={bem.element('category-block', {hidden: !items.games.length})}>
                <MdVideogameAsset />
                {items.games.map((game, key) => (
                    <Link key={game.rawg_id}
                        toRoute={ROUTE_GAME}
                        toRouteParams={{id: game.rawg_id}}
                        className={bem.element('hint')}
                    >
                        <div>{game.rawg_name}</div>
                        <div>{game?.rawg_release_date?.substr(0, 4)}</div>
                    </Link>
                ))}
            </div>
            <div className={bem.element('category-block', {hidden: !items.movies.length})}>
                <MdLocalMovies />
                {items.movies.map((movie, key) => (
                    <Link key={movie.tmdb_id}
                          toRoute={ROUTE_MOVIE}
                          toRouteParams={{id: movie.tmdb_id}}
                          className={bem.element('hint')}>
                        <div>{movie.tmdb_name}</div>
                        <div>{movie?.tmdb_release_date?.substr(0, 4)}</div>
                    </Link>
                ))}
            </div>
            <div className={bem.element('category-block', {hidden: !items.shows.length})}>
                <MdLiveTv />
                {items.shows.map((show, key) => (
                    <Link
                        key={show.tmdb_id}
                        toRoute={ROUTE_SHOW}
                        toRouteParams={{id: show.tmdb_id}}
                        className={bem.element('hint')}>
                        <div>{show.tmdb_name}</div>
                        <div>{show?.tmdb_release_date?.substr(0, 4)}</div>
                    </Link>
                ))}
            </div>
        </>
    );

    return (
        <div className={bem(bem.block(), props.className)}>
            <input
                className={bem.element('input')}
                onClick={(e) => {
                    e.preventDefault();
                    // props.onOpen();
                }}
                onChange={e => setQuery(e.target.value)}
                placeholder={__('Поиск')}
            />

                <div className={bem.element('drop-down')}>
                    <div className={bem.element('list')}>
                        {!_isEmpty(items.games) || !_isEmpty(items.movies) || !_isEmpty(items.shows)
                            ? renderItems()
                            : (
                                <div className={bem.element('nothing-text')}>
                                    {__('Ничего не найдено!')}
                                </div>
                            )}
                    </div>
                </div>
        </div>
    );
}

export default SearchField;
