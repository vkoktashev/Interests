'use client';

import React from 'react';
import Typography from 'antd/es/typography';
import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import {theme} from 'antd';

const {useToken} = theme;

function RootPage() {
    const {token} = useToken();

    return (
        <main style={{
            backgroundColor: token.colorBgBase,
            padding: token.paddingXL,
        }}
        >
            <Typography>
                <Title>
                    Добро пожаловать на Interests!
                </Title>
                <div>
                    <Title level={3}>
                        Что это?
                    </Title>
                    <Paragraph>
                        Interests - сайт для отслеживания фильмов, сериалов и видеоигр.
                    </Paragraph>

                    <Title level={3}>
                        Какой функционал у сайта?
                    </Title>
                    <Paragraph>
                        Здесь можно вести персональный список интересного вам контента, выставлять ему оценки
                        и писать отзывы, а также отслеживать активность ваших друзей.
                    </Paragraph>
                    <Paragraph>
                        В профиле собраны все добавленные игры, фильмы и сериалы, а также ваша персональная статистика.
                    </Paragraph>
                    <Paragraph>
                        C помощью поиска можно найти интересующий вас тайтл или человека.
                    </Paragraph>
                    <Paragraph>
                        В календаре отображены все грядущие релизы из вашего списка. Вы можете подписаться на
                        email уведомления о новых релизах в настройках
                    </Paragraph>
                    <Paragraph>
                        Раздел непросмотренное предназначен для отслеживания непросмотренных серий ваших сериалов.
                    </Paragraph>

                    <Title level={3}>
                        Что такое статус контента
                    </Title>
                    <Paragraph>
                        На странице фильма, сериала или игры есть блок кнопок, состоящий из различных статусов.
                        При выборе любого статуса, кроме &quot;Не смотрел&quot; или &quot;Не играл&quot;, тайтл добавляется к вам в профиль.
                    </Paragraph>
                    <Paragraph>
                        В зависимости от статуса, тайтл будет по разному восприниматься системой. Например, тайтлы
                        со статусом &quot;Буду смотреть&quot; не учитываются при подсчете статистики. Или сериалы со статусом
                        &quot;Дропнул&quot; не будут выводиться в разделах Непросмотренное и Календарь.
                    </Paragraph>

                    <Title level={3}>
                        Зачем нужна подписка на пользователя
                    </Title>
                    <Paragraph>
                        После подписки на пользователя вы будете видеть активность всех своих друзей в разделе Профиль, во вкладке Друзья.
                    </Paragraph>
                    <Paragraph>
                        На странице любого тайтла будут отображены отзывы ваших друзей, если они оценили его ранее.
                    </Paragraph>
                </div>
            </Typography>
        </main>
    );
}

export default RootPage;
