import React, {useState, useEffect, useCallback} from 'react';
import Fade from 'react-reveal/Fade';
import RandomCard from './views/RandomCard';
import Image from '../../shared/Image';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import { getUser } from '@steroidsjs/core/reducers/auth';
import {Button, CheckboxField, Form} from '@steroidsjs/core/ui/form';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import "./RandomPage.scss";

const categoriesEnum = [
    {id: 'games', label: 'Игры'},
    {id: 'shows', label: 'Сериалы'},
    {id: 'movies', label: 'Фильмы'},
]

function RandomPage() {
    const user = useSelector(getUser);
    const dispatch = useDispatch();
    const {http} = useComponents();
    const bem = useBem('RandomPage');
    const [winner, setWinner] = useState<null | any>(null);
    const [isLoading, setLoading] = useState(false);

    const onSubmit = useCallback((values: any) => {
        if (user) {
            setWinner(null);
            setLoading(true);
            const params = {
                categories: Object.entries(values)
                    .filter(([key, value]) => key !== 'endedOnly' && value)
                    .map(([key]) => key),
                endedOnly: values.endedOnly,
            };
            http.get('api/users/user/random/', params)
                .then(response => {
                    setWinner(response[0]);
                })
                .catch(e => {
                    dispatch(showNotification(`Ошибка сервера ${e.response.data?.error}`, 'danger'));
                });
        }
    }, [user]);

    return (
        <div className={bem.block()}>
            <Form
                onSubmit={onSubmit}
                className={bem.element('form')}
            >
                <h1 className={bem.element('header')}>
                    Рандомайзер
                </h1>
                <div>
                    <div className={bem.element('label')}>
                        Категории
                    </div>
                    {
                        categoriesEnum.map((category: any) => (
                            <CheckboxField
                                attribute={category.id}
                                label={category.label}
                                key={category.id}
                                className={bem.element('checkbox')}
                            />
                        ))
                    }
                </div>
                <CheckboxField
                    attribute='endedOnly'
                    label={__('Только завершенные сериалы')}
                    className={bem.element('checkbox')}
                />
                <Button
                    type='submit'
                    label='Крутануть'
                />
            </Form>
            {winner?.tmdb_poster_path
                ? (
                    <Image src={winner?.tmdb_poster_path}
                           onLoad={() => setLoading(false)}
                           style={{width: 0, height: 0}} />
                ) : (
                    <img
                        src={winner?.rawg_poster_path}
                        onLoad={() => setLoading(false)}
                        style={{width: 0, height: 0}}
                    />
                )}

            {
                winner && (
                    <Fade right duration={500} distance='50px'>
                        <RandomCard winner={winner} />
                    </Fade>
                )
            }
            {/*{*/}
            {/*    isLoading && (*/}
            {/*        <RandomCardLoader />*/}
            {/*    )*/}
            {/*}*/}
        </div>
);
}

export default RandomPage;
