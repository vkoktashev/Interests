import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { FaLock } from "react-icons/fa";
import LoadingOverlay from "react-loading-overlay";
import {useBem, useComponents, useDispatch, useFetch, useSelector} from '@steroidsjs/core/hooks';
import {useQueryParams, StringParam} from "use-query-params";

import GameBlock from './views/ItemsBlock/GameBlock';
import FriendBlock from '../../shared/FriendBlock';
import MovieBlock from './views/ItemsBlock/MovieBlock';
import CategoriesTab from '../../shared/CategoriesTab';
import ShowBlock from './views/ItemsBlock/ShowBlock';
import StatisticsBlock from './views/StatisticsBlock';
import PeopleBlock from './views/PeopleBlock';
import CollectionsBlock from './views/CollectionsBlock';

import "./user-page.scss";
import {getRouteParams} from "@steroidsjs/core/reducers/router";
import {getUser} from '@steroidsjs/core/reducers/auth';
import {Loader} from '@steroidsjs/core/ui/layout';
import UserLogs from './views/UserLogs/UserLogs';
import FriendsLogs from './views/FriendsLogs/FriendsLogs';
import UserHeader from './views/UserHeader';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {isSessionExpiredError} from '../../components/SafeJwtHttpComponent';
import {EMPTY_LIST_QUERY, LIST_QUERY_PARAMS} from './views/ItemsBlock/listQuery';

const TABS = [
	{key: 'feed', label: 'Лента'},
	{key: 'games', label: 'Игры'},
	{key: 'movies', label: 'Фильмы'},
	{key: 'shows', label: 'Сериалы'},
	{key: 'collections', label: 'Подборки'},
	{key: 'people', label: 'Люди'},
	{key: 'stats', label: 'Статистика'},
	{key: 'friends', label: 'Друзья'},
];
const DEFAULT_TAB = 'feed';
const LIST_TABS = ['games', 'movies', 'shows', 'people'];

const getTabKey = (value?: string | null) => TABS.find(tab => tab.key === value || tab.label === value)?.key;

/**
 * Основная страница приложения
 */
function UserPage() {
	const bem = useBem('user-page');
	const currentUser = useSelector(getUser);
	const {http} = useComponents();
	const dispatch = useDispatch();
	const {userId} = useSelector(getRouteParams);

	const [urlQuery, setUrlQuery] = useQueryParams({
		tab: StringParam,
		// Old profile links used a Cyrillic "с" in the parameter name and Russian tab labels as values.
		сategory: StringParam,
		...LIST_QUERY_PARAMS,
	});
	const activeTab = getTabKey(urlQuery.tab) || DEFAULT_TAB;
	const activeCategory = TABS.find(tab => tab.key === activeTab).label;

	useEffect(() => {
		if (urlQuery.сategory !== undefined) {
			const legacyTab = getTabKey(urlQuery.сategory);
			setUrlQuery({
				tab: legacyTab && legacyTab !== DEFAULT_TAB ? legacyTab : undefined,
				сategory: undefined,
			}, 'replaceIn');
		}
	}, [urlQuery.сategory]);

	const setActiveCategory = useCallback((label: string) => {
		const tabKey = getTabKey(label);
		if (tabKey === activeTab) {
			return;
		}
		setUrlQuery({
			tab: tabKey === DEFAULT_TAB ? undefined : tabKey,
			...EMPTY_LIST_QUERY,
		}, 'pushIn');
	}, [activeTab, setUrlQuery]);
	const [lastActivity, setLastActivity] = useState("");

	const userFetchConfig = useMemo(() => userId && ({
		url: `/users/user/${userId}/`,
		method: 'get',
	}), [userId]);
	const {data: user, isLoading, fetch} = useFetch(userFetchConfig);

	const isCurrentUser = user?.id === currentUser?.id;
	const isAvailable = Boolean(user?.is_available) && String(user?.id) === String(userId);

	// The active tab's list loads first; the rest are prefetched once the visible content is ready,
	// and all of them are kept while the profile stays open.
	const [lists, setLists] = useState<Record<string, any[]>>({});
	const [isFeedLoaded, setIsFeedLoaded] = useState(false);
	const [isPrefetchStarted, setIsPrefetchStarted] = useState(false);
	const loadingListsRef = useRef<Set<string>>(new Set());
	const userIdRef = useRef(userId);
	userIdRef.current = userId;
	const activeListKey = LIST_TABS.includes(activeTab) ? activeTab : undefined;

	useEffect(() => {
		setLists({});
		setIsFeedLoaded(false);
		setIsPrefetchStarted(false);
		loadingListsRef.current = new Set();
	}, [userId]);

	const onFeedLoad = useCallback(() => setIsFeedLoaded(true), []);

	const loadList = useCallback((key: string, isBackground: boolean) => {
		const loadingLists = loadingListsRef.current;
		if (loadingLists.has(key)) {
			return;
		}
		const requestUserId = userId;
		loadingLists.add(key);
		http.get(`/users/user/${requestUserId}/${key}/`)
			.then(data => {
				if (userIdRef.current === requestUserId) {
					setLists(prev => ({...prev, [key]: data}));
				}
			})
			.catch(error => {
				// A failed prefetch is retried quietly when its tab is opened.
				if (!isBackground && userIdRef.current === requestUserId && !isSessionExpiredError(error)) {
					dispatch(showNotification('Не удалось загрузить список', 'error'));
				}
			})
			.finally(() => loadingLists.delete(key));
	}, [userId]);

	useEffect(() => {
		if (activeListKey && isAvailable && !lists[activeListKey]) {
			loadList(activeListKey, false);
		}
	}, [activeListKey, isAvailable, lists, loadList]);

	const isVisibleContentLoaded = activeListKey
		? Boolean(lists[activeListKey])
		: activeTab !== DEFAULT_TAB || isFeedLoaded;

	useEffect(() => {
		if (!isAvailable || !isVisibleContentLoaded || isPrefetchStarted) {
			return;
		}
		setIsPrefetchStarted(true);
		LIST_TABS
			.filter(key => !lists[key])
			.forEach(key => loadList(key, true));
	}, [isAvailable, isVisibleContentLoaded, isPrefetchStarted, lists, loadList]);

	const renderPrivate = () => (
		<h4>
			<FaLock style={{marginRight: "1rem"}}/>
			Профиль скрыт настройками приватности
		</h4>
	);

	const renderList = (key: string, render: (items: any[]) => React.ReactNode) => {
		if (!user.is_available) {
			return renderPrivate();
		}
		return lists[key] ? render(lists[key]) : <Loader/>;
	};

	const setUserStatus = useCallback(async (payload: any) => {
		http.send('PUT', `/users/user/${userId}/follow/`, payload).then(() => {
			fetch();
		}).catch(e => {
			fetch();
		});
	}, [fetch, userId]);

	useEffect(() => {
		if (user?.username) {
			document.title = "Профиль " + user.username;
		}

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
						categories={TABS.map(tab => tab.label)}
						activeCategory={activeCategory}
						onChangeCategory={setActiveCategory}
					>
						{activeCategory === "Лента" && (
							<div>
								<div hidden={!user.is_available}>
									<UserLogs userId={userId} onLoad={onFeedLoad}/>
								</div>
								<h4 hidden={user.is_available || isLoading}>
									<FaLock style={{marginRight: "1rem"}}/>
									Профиль скрыт настройками приватности
								</h4>
							</div>
						)}
						{activeCategory === "Игры" && (
							<div>
								{renderList('games', games => <GameBlock games={games}/>)}
							</div>
						)}
						{activeCategory === "Фильмы" && (
							<div>
								{renderList('movies', movies => <MovieBlock movies={movies}/>)}
							</div>
						)}
						{activeCategory === "Сериалы" && (
							<div>
								{renderList('shows', shows => <ShowBlock shows={shows}/>)}
							</div>
						)}
						{activeCategory === "Подборки" && (
							<CollectionsBlock
								userId={userId}
								isCurrentUser={isCurrentUser}
								isAvailable={user.is_available}
							/>
						)}
						{activeCategory === "Люди" && (
							<div>
								{renderList('people', people => (
									<PeopleBlock
										people={people}
										showKnownFor={Boolean(currentUser?.id)}
									/>
								))}
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
								{isCurrentUser && (
									<div>
										<h4 className='user-page__friends-header'>
											{__('Активность друзей:')}
										</h4>
										<FriendsLogs userId={userId}/>
									</div>
								)}
							</div>
						)}
					</CategoriesTab>
				</div>
			</LoadingOverlay>
		</div>
	);
}

export default UserPage;
