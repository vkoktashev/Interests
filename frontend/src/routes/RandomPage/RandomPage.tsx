import React, {useState, useEffect, useCallback} from 'react';
import { observer } from "mobx-react";
import { block } from 'bem-cn';
import { useForm } from 'react-hook-form';
import { toast } from "react-toastify";
import Fade from 'react-reveal/Fade';

import AuthStore from '../../store/AuthStore';
import "./RandomPage.sass";
import {getRoulette} from '../../services/userRequests';
import Button from '../../shared/Button';
import RandomCard from './views/RandomCard';
import RandomCardLoader from './views/RandomCardLoader';
const categoriesEnum = [
    {id: 'games', label: 'Игры'},
    {id: 'shows', label: 'Сериалы'},
    {id: 'movies', label: 'Фильмы'},
]

const RandomPage = observer(() => {
    const { loggedIn, user } = AuthStore;
    const bem = block('RandomPage')
    const [winner, setWinner] = useState<null | any>(null);
    const [isLoading, setLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = useCallback((values: any) => {
        if (loggedIn) {
            setWinner(null);
            setLoading(true);
            getRoulette(values)
                .then(newItems => {
                    setWinner(newItems[0]);
                })
                .catch(e => toast.error(`Ошибка сервера ${e.response.data?.error}`));
        }
    }, [loggedIn]);

    return (
        <div className={bem()}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className={bem('form')}
            >
                <h1 className={bem('header')}>
                    Рандомайзер
                </h1>
                <div>
                    <div className={bem('label')}>
                        Категории
                    </div>
                    {
                        categoriesEnum.map((category: any) => (
                            <div key={category.id}>
                                <input
                                    type='checkbox'
                                    value={category.id}
                                    id={category.id}
                                    {...register('categories')}
                                />
                                <label htmlFor={category.id}>
                                    {category.label}
                                </label>
                            </div>
                        ))
                    }
                </div>
                <div>
                    <input
                        id='endedOnly'
                        type='checkbox'
                        {...register('endedOnly')}
                    />
                    <label htmlFor='endedOnly'>
                        Только завершенные сериалы
                    </label>
                </div>
                <Button
                    type='submit'
                    label='Крутануть'
                />
            </form>
            <img
                src={winner?.tmdb_poster_path || winner?.rawg_poster_path}
                onLoad={() => setLoading(false)}
                style={{width: 0, height: 0}}
            />
            {
                winner && !isLoading && (
                    <Fade right duration={500} distance='50px'>
                        <RandomCard winner={winner} />
                    </Fade>
                )
            }
            {
                isLoading && (
                    <RandomCardLoader />
                )
            }
        </div>
);
});

export default RandomPage;
