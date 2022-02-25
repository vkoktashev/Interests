import React, { useEffect, useRef, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { observer } from 'mobx-react';
import LoadingOverlay from 'react-loading-overlay';
import { FaSearch } from 'react-icons/fa';

import SearchStore from '../../store/SearchStore';

import GameCards from './views/GameCards';
import MovieCards from './views/MovieCards';
import ShowCards from './views/ShowCards';
import UserCards from './views/UserCards';
import CategoriesTab from '../../shared/CategoriesTab';

import './search-page.sass';
import useScroll from '../../hooks/useScroll';

/**
 * Основная страница приложения
 */
const SearchPage = observer(() => {
	const store = SearchStore;

	let history = useHistory();
	let { query }: any = useParams();
	const [queryText, setQueryText] = useState('');

	const parentRef = useRef() as React.MutableRefObject<HTMLInputElement>;
	const childRef = useRef() as React.MutableRefObject<HTMLInputElement>;
	// eslint-disable-next-line
	const intersected = useScroll(parentRef, childRef, () => fetchItems());

	const [activeCategory, setActiveCategory] = useState('Игры');

	function fetchItems() {
		if (activeCategory === 'Игры') store.nextGames();
		if (activeCategory === 'Фильмы') store.nextMovies();
		if (activeCategory === 'Сериалы') store.nextShows();
	}

	useEffect(
		() => {
			if (activeCategory === 'Игры') store.searchGames(query);
			if (activeCategory === 'Фильмы') store.searchMovies(query);
			if (activeCategory === 'Сериалы') store.searchShows(query);
			if (activeCategory === 'Пользователи') store.searchUsers(query);
			setQueryText(query);
			document.title = 'Поиск';
		},
		// eslint-disable-next-line
		[query, activeCategory]
	);


	return (
		<div className='search-page'>
			<div className='search-page__body'>
				<form
					className='search-page__form'
					onSubmit={(event) => {
						event.preventDefault();
						history.push('/search/' + queryText);
						return false;
					}}>
					<h1>Поиск</h1>
					<FaSearch className='search-page__name-icon' />
					<input
						className='search-page__name-input'
						type='text'
						placeholder='Найти'
						value={queryText}
						onChange={(e) => setQueryText(e.target.value)}
					/>
				</form>
				<CategoriesTab
					categories={['Игры', 'Фильмы', 'Сериалы', 'Пользователи']}
					activeCategory={activeCategory}
					onChangeCategory={(category: string) => {
						setActiveCategory(category);
					}}>
					<div className='search-page__results' ref={parentRef}>
						<LoadingOverlay active={store.gamesState === 'pending'} spinner text='Ищем игры...'>
							<GameCards games={store.games.values} hidden={activeCategory !== 'Игры'} />
						</LoadingOverlay>

						<LoadingOverlay active={store.moviesState === 'pending'} spinner text='Ищем фильмы...'>
							<MovieCards movies={store.movies.values} hidden={activeCategory !== 'Фильмы'} />
						</LoadingOverlay>

						<LoadingOverlay active={store.showsState === 'pending'} spinner text='Ищем сериалы...'>
							<ShowCards shows={store.shows.values} hidden={activeCategory !== 'Сериалы'} />
						</LoadingOverlay>

						<LoadingOverlay active={store.usersState === 'pending'} spinner text='Ищем пользователей...'>
							<UserCards users={store.users.values} hidden={activeCategory !== 'Всё' && activeCategory !== 'Пользователи'} />
						</LoadingOverlay>

						<div ref={childRef} style={{ height: 20 }} />
					</div>
				</CategoriesTab>
			</div>
		</div>
	);
});

export default SearchPage;
