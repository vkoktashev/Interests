import {useComponents} from '@steroidsjs/core/hooks';
import {useCallback, useEffect, useState} from 'react';
import IGameFastSearch from '../types/IGameFastSearch';
import IMovieFastSearch from '../types/IMovieFastSearch';
import IShowFastSearch from '../types/IShowFastSearch';

interface IResult {
    games: IGameFastSearch[],
    gamesIsLoading: boolean,
    movies: IMovieFastSearch[],
    moviesIsLoading: boolean,
    shows: IShowFastSearch[],
    showsIsLoading: boolean,
}

export default function useFastSearchDataProvider(query: string): IResult {
    const {http} = useComponents();

    const [games, setGames] = useState([]);
    const [movies, setMovies] = useState([]);
    const [shows, setShows] = useState([]);

    const [gamesIsLoading, setGamesLoading] = useState(false);
    const [moviesIsLoading, setMoviesLoading] = useState(false);
    const [showsIsLoading, setShowsLoading] = useState(false);

    const fetchGames = useCallback(async (query: string) => {
        setGamesLoading(true);
        const result = await http.get('/games/search/', {query});
        if (result?.length) {
            setGames(result);
        }
        setGamesLoading(false);
    }, []);

    const fetchMovies = useCallback(async (query: string) => {
        setMoviesLoading(true);
        const result = await http.get('/movies/search/', {query});
        if (result?.length) {
            setMovies(result);
        }
        setMoviesLoading(false);
    }, []);

    const fetchShows = useCallback(async (query: string) => {
        setShowsLoading(true);
        const result = await http.get('/shows/search/', {query});
        if (result?.length) {
            setShows(result);
        }
        setShowsLoading(false);
    }, []);

    useEffect(() => {
        if (query && typeof query === 'string' && query.trim()) {
            fetchGames(query);
            fetchMovies(query);
            fetchShows(query);
        }
    }, [query]);

    return {games, gamesIsLoading, movies, moviesIsLoading, shows, showsIsLoading};
}
