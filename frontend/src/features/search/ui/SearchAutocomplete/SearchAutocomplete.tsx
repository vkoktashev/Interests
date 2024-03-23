"use client"
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Autocomplete from '@/shared/ui/Autocomplete';
import useDebounce from '@/shared/hooks/useDebounce';
import {fetchItemsAutocomplete} from '@/features/search/ui/api';
import {IAutoCompleteItem} from '@/shared/ui/Autocomplete/Autocomplete';

interface ISearchAutocomplete {
    className?: string,
}

function SearchAutocomplete(props: ISearchAutocomplete) {
    const [items, setItems] = useState<IAutoCompleteItem[]>([]);
    const [query, setQuery] = useState<string>('');
    const debouncedValue = useDebounce(query);

    const onQueryChange = useCallback((query: string) => setQuery(query), [setQuery]);

    useEffect(() => {
        if (debouncedValue) {
            fetchItemsAutocomplete(debouncedValue).then(result => {
                setItems([
                    ...result.games.map(game => ({
                        id: game.rawg_id.toString(),
                        label: game.rawg_name,
                        categoryId: 'game',
                    })),
                    ...result.movies.map(movie => ({
                        id: movie.tmdb_id.toString(),
                        label: movie.tmdb_name,
                        categoryId: 'movie',
                    })),
                    ...result.shows.map(show => ({
                        id: show.tmdb_id.toString(),
                        label: show.tmdb_name,
                        categoryId: 'show',
                    })),
                    ...result.users.map(user => ({
                        id: user.id.toString(),
                        label: user.username,
                        categoryId: 'user',
                    })),
                ]);
            });
        } else {
            setItems([]);
        }
    }, [debouncedValue]);

    const categories = useMemo(() => ([
        {id: 'game', label: 'Игры'},
        {id: 'movie', label: 'Фильмы'},
        {id: 'show', label: 'Сериалы'},
        {id: 'user', label: 'Пользователи'},
    ]), [])

    return (
        <Autocomplete
            items={items}
            categories={categories}
            onQueryChange={onQueryChange}
            className={props.className}
        />
    )
}

export default SearchAutocomplete;
