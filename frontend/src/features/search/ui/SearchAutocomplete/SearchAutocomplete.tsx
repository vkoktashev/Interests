'use client';

import React, {CSSProperties, useCallback, useEffect, useMemo, useState} from 'react';
import {AutoComplete, Input} from 'antd';
import {useRouter} from 'next/navigation';
import useDebounce from '@/shared/hooks/useDebounce';
import gamepad from '@/../public/icons/gamepad.svg';
import film from '@/../public/icons/film.svg';
import tv from '@/../public/icons/tv.svg';
import users from '@/../public/icons/users.svg';
import {fetchItemsAutocomplete} from '@/features/search/ui/api';
import SearchAutocompleteCategory from '@/features/search/ui/SearchAutocomplete/views/SearchAutocompleteCategory';
import {IGameAutocomplete} from '@/entities/game/model/interfaces';
import {IMovieAutocomplete} from '@/entities/movie/model/interfaces';
import {IShowAutocomplete} from '@/entities/show/model/interfaces';
import {IUserAutocomplete} from '@/entities/user/model/interfaces';
import SearchAutocompleteItem from './views/SearchAutocompleteItem';

interface ISearchAutocomplete {
    style?: CSSProperties,
}

function SearchAutocomplete(props: ISearchAutocomplete) {
    const [items, setItems] = useState<{
        games: IGameAutocomplete[],
        movies: IMovieAutocomplete[],
        shows: IShowAutocomplete[],
        users: IUserAutocomplete[],
    } | null>();
    const [query, setQuery] = useState<string>('');
    const [isLoading, setLoading] = useState<boolean>(false);
    const debouncedValue = useDebounce(query);
    const router = useRouter();

    const onQueryChange = useCallback((event: any) => setQuery(event.target.value), [setQuery]);

    useEffect(() => {
        if (debouncedValue) {
            setLoading(true);
            fetchItemsAutocomplete(debouncedValue).then(result => {
                setItems(result);
            }).finally(() => setLoading(false));
        } else {
            setItems(null);
        }
    }, [debouncedValue]);

    const renderTitle = (title: string, icon: React.FC) => (
        <SearchAutocompleteCategory
            title={title}
            icon={icon}
        />
    );

    const renderItem = (title: string, year: number | null, link: string) => ({
        value: title,
        link,
        label: <SearchAutocompleteItem
            title={title}
            year={year}
            link={link}
        />,
    });

    const categories = useMemo(() => ([
        {
            label: renderTitle('Игры', gamepad),
            options: items?.games?.map(game => renderItem(
                game.rawg_name,
                new Date(game.rawg_release_date).getFullYear(),
                `/game/${game.rawg_slug}`,
            )),
        },
        {
            label: renderTitle('Фильмы', film),
            options: items?.movies?.map(movie => renderItem(
                movie.tmdb_name,
                new Date(movie.tmdb_release_date).getFullYear(),
                `/movie/${movie.tmdb_id}`,
            )),
        },
        {
            label: renderTitle('Сериалы', tv),
            options: items?.shows?.map(show => renderItem(
                show.tmdb_name,
                new Date(show.tmdb_release_date).getFullYear(),
                `/show/${show.tmdb_id}`,
            )),
        },
        {
            label: renderTitle('Пользователи', users),
            options: items?.users?.map(user => renderItem(
                user.username,
                null,
                `/user/${user.id}`,
            )),
        },
    ]), [items]);

    const onSelect = useCallback((title: string, item: ReturnType<typeof renderItem>) => {
        router.push(item.link);
    }, []);

    return (
        <AutoComplete
            popupClassName="certain-category-search-dropdown"
            style={{
                maxWidth: 450,
                width: '50%',
            }}
            options={categories}
            onSelect={onSelect as any}
            defaultActiveFirstOption
            listHeight={700}
            size="large"
        >
            <Input.Search
                size="large"
                placeholder="Искать"
                loading={isLoading}
                onChange={onQueryChange}
            />
        </AutoComplete>
    );
}

export default SearchAutocomplete;
