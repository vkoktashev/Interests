import React, { useEffect, useRef, useState } from "react";
import useInput from "../../../hooks/useInput";
import { useParams, useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import SearchStore from "../../../store/SearchStore";

import { FaSearch } from "react-icons/fa";

import LoadingOverlay from "react-loading-overlay";
import GameCards from "../SearchCards/GameCards";
import MovieCards from "../SearchCards/MovieCards";
import ShowCards from "../SearchCards/ShowCards";
import UserCards from "../SearchCards/UserCards";
import CategoriesTab from "../../Common/CategoriesTab/CategoriesTab";

import "./search-page.sass";
import useScroll from "../../../hooks/useScroll";

/**
 * Основная страница приложения
 */
const SearchPage = observer((props) => {
	const store = SearchStore;

	let history = useHistory();
	let { query } = useParams();
	const queryText = useInput("");

	const parentRef = useRef();
	const childRef = useRef();
	// eslint-disable-next-line
	const intersected = useScroll(parentRef, childRef, () => fetchItems());

	const [activeCategory, setActiveCategory] = useState("Игры");

	function fetchItems() {
		if (activeCategory === "Игры") store.nextGames();
		if (activeCategory === "Фильмы") store.nextMovies();
		if (activeCategory === "Сериалы") store.nextShows();
	}

	useEffect(
		() => {
			if (activeCategory === "Игры") store.searchGames(query);
			if (activeCategory === "Фильмы") store.searchMovies(query);
			if (activeCategory === "Сериалы") store.searchShows(query);
			if (activeCategory === "Пользователи") store.searchUsers(query);
			queryText.setValue(query);
			document.title = "Поиск";
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
						history.push("/search/" + queryText.value);
						return false;
					}}>
					<h1>Поиск</h1>
					<FaSearch className='search-page__name-icon' />
					<input className='search-page__name-input' type='text' placeholder='Найти' {...queryText} />
				</form>
				<CategoriesTab
					categories={["Игры", "Фильмы", "Сериалы", "Пользователи"]}
					activeCategory={activeCategory}
					onChangeCategory={(category) => {
						setActiveCategory(category);
					}}>
					<div className='search-page__results' ref={parentRef}>
						<LoadingOverlay active={store.gamesState === "pending"} spinner text='Ищем игры...'>
							<GameCards games={store.games.values} hidden={activeCategory !== "Игры"} />
						</LoadingOverlay>

						<LoadingOverlay active={store.moviesState === "pending"} spinner text='Ищем фильмы...'>
							<MovieCards movies={store.movies.values} hidden={activeCategory !== "Фильмы"} />
						</LoadingOverlay>

						<LoadingOverlay active={store.showsState === "pending"} spinner text='Ищем сериалы...'>
							<ShowCards shows={store.shows.values} hidden={activeCategory !== "Сериалы"} />
						</LoadingOverlay>

						<LoadingOverlay active={store.usersState === "pending"} spinner text='Ищем пользователей...'>
							<UserCards users={store.users.values} hidden={activeCategory !== "Всё" && activeCategory !== "Пользователи"} />
						</LoadingOverlay>

						<div ref={childRef} style={{ height: 20 }} />
					</div>
				</CategoriesTab>
			</div>
		</div>
	);
});

export default SearchPage;
