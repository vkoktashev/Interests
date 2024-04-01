"use client"
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Autocomplete from '@/shared/ui/Autocomplete';
import useDebounce from '@/shared/hooks/useDebounce';
import {fetchItemsAutocomplete} from '@/features/search/ui/api';
import {IAutoCompleteCategory, IAutoCompleteItem} from '@/shared/ui/Autocomplete/Autocomplete';
import gamepad from '@/../public/icons/gamepad.svg';
import film from '@/../public/icons/film.svg';
import tv from '@/../public/icons/tv.svg';
import users from '@/../public/icons/users.svg';
import SearchAutocompleteItemView from '@/features/search/ui/SearchAutocomplete/views/SearchAutocompleteItemView';

interface ISearchAutocomplete {
    className?: string,
}

export interface ISearchAutocompleteItem extends IAutoCompleteItem {
    year?: number,
    href: string,
}

function SearchAutocomplete(props: ISearchAutocomplete) {
    const [items, setItems] = useState<ISearchAutocompleteItem[]>([]);
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
                        year: new Date(game.rawg_release_date).getFullYear(),
                        href: `/game/${game.rawg_slug}`,
                    })),
                    ...result.movies.map(movie => ({
                        id: movie.tmdb_id.toString(),
                        label: movie.tmdb_name,
                        categoryId: 'movie',
                        year: new Date(movie.tmdb_release_date).getFullYear(),
                        href: `/movie/${movie.tmdb_id}`,
                    })),
                    ...result.shows.map(show => ({
                        id: show.tmdb_id.toString(),
                        label: show.tmdb_name,
                        categoryId: 'show',
                        year: new Date(show.tmdb_release_date).getFullYear(),
                        href: `/show/${show.tmdb_id}`,
                    })),
                    ...result.users.map(user => ({
                        id: user.id.toString(),
                        label: user.username,
                        categoryId: 'user',
                        href: `/user/${user.id}`,
                    })),
                ]);
            });
        } else {
            setItems([]);
        }
    }, [debouncedValue]);

    const categories = useMemo<IAutoCompleteCategory[]>(() => ([
        {id: 'game', label: 'Игры', icon: gamepad},
        {id: 'movie', label: 'Фильмы', icon: film},
        {id: 'show', label: 'Сериалы', icon: tv},
        {id: 'user', label: 'Пользователи', icon: users},
    ]), [])

    return (
        <Autocomplete<ISearchAutocompleteItem>
            items={items}
            categories={categories}
            onQueryChange={onQueryChange}
            onSelect={console.log}
            className={props.className}
            itemComponent={SearchAutocompleteItemView}
        />
    )
}

export default SearchAutocomplete;
