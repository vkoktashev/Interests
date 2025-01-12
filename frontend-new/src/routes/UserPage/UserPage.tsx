import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { FaLock } from "react-icons/fa";
import LoadingOverlay from "react-loading-overlay";
import {useComponents, useFetch, useSelector} from '@steroidsjs/core/hooks';
import { useQueryParam, StringParam, withDefault } from "use-query-params";

import GameBlock from './views/ItemsBlock/GameBlock';
import FriendBlock from '../../shared/FriendBlock';
import MovieBlock from './views/ItemsBlock/MovieBlock';
import LogsBlock from './views/LogsBlock';
import CategoriesTab from '../../shared/CategoriesTab';
import ShowBlock from './views/ItemsBlock/ShowBlock';
import StatisticsBlock from './views/StatisticsBlock';

import "./user-page.scss";
import {getRouteParams} from "@steroidsjs/core/reducers/router";
import {getUser} from '@steroidsjs/core/reducers/auth';
import {Loader} from '@steroidsjs/core/ui/layout';
import UserLogs from './views/UserLogs/UserLogs';
import FriendsLogs from './views/FriendsLogs/FriendsLogs';

/**
 * Основная страница приложения
 */
function UserPage() {
	const currentUser = useSelector(getUser);
	const {http} = useComponents();
	const {userId} = useSelector(getRouteParams);

	const [activeCategory, setActiveCategory] = useQueryParam("сategory", withDefault(StringParam, "Лента"));
	const [lastActivity, setLastActivity] = useState("");

	const userFetchConfig = useMemo(() => userId && ({
		url: `/users/user/${userId}/`,
		method: 'get',
	}), [userId]);
	const {data: user, isLoading, fetch} = useFetch(userFetchConfig);

	const isCurrentUser = user?.id === currentUser.id;

	const setUserStatus = useCallback(async (payload: any) => {
		http.send('PUT', `/users/user/${userId}/follow/`, payload).catch(e => {
			fetch();
		});
	}, [fetch, userId]);

	useEffect(() => {
		document.title = user?.username
			? "Профиль " + user.username
			: 'Interests';
		if (user?.last_activity) {
			let date = new Date(user?.last_activity);
			let options = {
				year: date.getFullYear() === new Date().getFullYear()
					? undefined
					: "numeric",
				month: "long",
				day: "numeric",
				hour: "numeric",
				minute: "numeric",
			};
			setLastActivity(date.toLocaleString("ru-RU", options as any));
		} else setLastActivity("");
	}, [user]);

	if (!user) {
		return <Loader />;
	}

	return (
		<div className='user-page'>
			<LoadingOverlay
				active={isLoading}
				spinner
				text='Загрузка...'
			>
				<div className='user-page__body'>
					<div className='user-page__header'>
						<div className='user-page__user-card'>
							<div className='user-page__user-avatar' style={{ backgroundImage: `url(${"https://upload.wikimedia.org/wikipedia/commons/f/f4/User_Avatar_2.png"})` }} />
							<div>
								<h2 className='user-page__username'>
									{user.username}
								</h2>
								<div hidden={!user.is_available} className='user-page__last-activity'>
									Последняя активность {lastActivity}
								</div>
							</div>
						</div>

						<button
							hidden={isCurrentUser || !user.is_available}
							className='user-page__subscribe-button'
							onClick={() => {
								setUserStatus({ is_following: !user.is_followed });
							}}>
							{user.is_followed ? "Отписаться" : "Подписаться"}
						</button>
					</div>

					<CategoriesTab
						categories={["Лента", "Игры", "Фильмы", "Сериалы", "Статистика", "Друзья"]}
						activeCategory={activeCategory}
						onChangeCategory={setActiveCategory}
					>
						<div hidden={activeCategory !== "Лента"}>
							<div hidden={!user.is_available}>
								<UserLogs userId={userId} />
							</div>
							<h4 hidden={user.is_available || isLoading}>
								<FaLock style={{ marginRight: "1rem" }} />
								Профиль скрыт настройками приватности
							</h4>
						</div>
						<div hidden={activeCategory !== "Игры"}>
							<GameBlock games={user.games} />
						</div>
						<div hidden={activeCategory !== "Фильмы"}>
							<MovieBlock movies={user.movies} />
						</div>
						<div hidden={activeCategory !== "Сериалы"}>
							<ShowBlock shows={user.shows} />
						</div>
						<div hidden={activeCategory !== "Статистика"}>
							<StatisticsBlock stats={user.stats} />
						</div>
						<div hidden={activeCategory !== "Друзья"}>
							<FriendBlock users={user.followed_users ? user.followed_users : []} />
							<div hidden={currentUser.username !== user.username}>
								<h4 className='user-page__friends-header'>
									{__('Активность друзей:')}
								</h4>
								<FriendsLogs userId={userId} />
							</div>
						</div>
					</CategoriesTab>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default UserPage;
