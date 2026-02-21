import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { FaLock } from "react-icons/fa";
import LoadingOverlay from "react-loading-overlay";
import {useBem, useComponents, useFetch, useSelector} from '@steroidsjs/core/hooks';
import { useQueryParam, StringParam, withDefault } from "use-query-params";

import GameBlock from './views/ItemsBlock/GameBlock';
import FriendBlock from '../../shared/FriendBlock';
import MovieBlock from './views/ItemsBlock/MovieBlock';
import CategoriesTab from '../../shared/CategoriesTab';
import ShowBlock from './views/ItemsBlock/ShowBlock';
import StatisticsBlock from './views/StatisticsBlock';

import "./user-page.scss";
import {getRouteParams} from "@steroidsjs/core/reducers/router";
import {getUser} from '@steroidsjs/core/reducers/auth';
import {Loader} from '@steroidsjs/core/ui/layout';
import UserLogs from './views/UserLogs/UserLogs';
import FriendsLogs from './views/FriendsLogs/FriendsLogs';
import UserHeader from './views/UserHeader';

/**
 * Основная страница приложения
 */
function UserPage() {
	const bem = useBem('user-page');
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
		<div className={bem.block()}>
			<LoadingOverlay
				active={isLoading}
				spinner
				text='Загрузка...'
			>
				<div className='user-page__body'>
					<UserHeader
						user={user}
						lastActivity={lastActivity}
						isCurrentUser={isCurrentUser}
						onToggleFollow={() => setUserStatus({is_following: !user.is_followed})}
					/>

					<CategoriesTab
						className={bem.element('tabs')}
						categories={["Лента", "Игры", "Фильмы", "Сериалы", "Статистика", "Друзья"]}
						activeCategory={activeCategory}
						onChangeCategory={setActiveCategory}
					>
						{activeCategory === "Лента" && (
							<div>
								<div hidden={!user.is_available}>
									<UserLogs userId={userId}/>
								</div>
								<h4 hidden={user.is_available || isLoading}>
									<FaLock style={{marginRight: "1rem"}}/>
									Профиль скрыт настройками приватности
								</h4>
							</div>
						)}
						{activeCategory === "Игры" && (
							<div>
								<GameBlock games={user.games}/>
							</div>
						)}
						{activeCategory === "Фильмы" && (
							<div>
								<MovieBlock movies={user.movies}/>
							</div>
						)}
						{activeCategory === "Сериалы" && (
							<div>
								<ShowBlock shows={user.shows}/>
							</div>
						)}
						{activeCategory === "Статистика" && (
							<div>
								{!user.is_available && (
									<h4>
										<FaLock style={{marginRight: "1rem"}}/>
										Профиль скрыт настройками приватности
									</h4>
								)}
								<div hidden={!user.is_available}>
									<StatisticsBlock userId={userId}/>
								</div>
							</div>
						)}
						{activeCategory === "Друзья" && (
							<div>
								<FriendBlock users={user.followed_users ? user.followed_users : []}/>
								<div hidden={currentUser.username !== user.username}>
									<h4 className='user-page__friends-header'>
										{__('Активность друзей:')}
									</h4>
									<FriendsLogs userId={userId}/>
								</div>
							</div>
						)}
					</CategoriesTab>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default UserPage;
