import React, { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import SearchStore from "../../store/SearchStore";

import { MDBIcon, MDBFormInline } from "mdbreact";

import LoadingOverlay from "react-loading-overlay";
import { toast } from "react-toastify";
import GamesBlock from "./Blocks/GamesBlock";
import MoviesBlock from "./Blocks/MoviesBlock";
import ShowsBlock from "./Blocks/ShowsBlock";
import UsersBlock from "./Blocks/UsersBlock";
import CategoriesTab from "../Common/CategoriesTab";

/**
 * Основная страница приложения
 */
const SearchPage = observer((props) => {
	const { gamesState, searchGames, games, moviesState, searchMovies, movies, showsState, searchShows, shows, usersState, searchUsers, users } = SearchStore;

	let history = useHistory();
	let { query } = useParams();
	const [queryText, setQueryText] = useState("");
	const [gamesPage, setGamesPage] = useState(1);
	const [moviesPage, setMoviesPage] = useState(1);
	const [showsPage, setShowsPage] = useState(1);

	const [activeCategory, setActiveCategory] = useState("Всё");

	useEffect(
		() => {
			if (activeCategory === "Всё" || activeCategory === "Игры") searchGames(query, 1, 6);
			if (activeCategory === "Всё" || activeCategory === "Фильмы") searchMovies(query, 1);
			if (activeCategory === "Всё" || activeCategory === "Сериалы") searchShows(query, 1);
			if (activeCategory === "Всё" || activeCategory === "Пользователи") searchUsers(query);
			setQueryText(query);
			document.title = "Поиск";
			setGamesPage(1);
			setMoviesPage(1);
			setShowsPage(1);
		},
		// eslint-disable-next-line
		[query, searchGames, searchMovies, searchUsers, searchShows, activeCategory]
	);

	useEffect(() => {
		if (gamesState.startsWith("error:")) toast.error(`Ошибка поиска игр! ${gamesState}`);
	}, [gamesState]);
	useEffect(() => {
		if (moviesState.startsWith("error:")) toast.error(`Ошибка поиска фильмов! ${moviesState}`);
	}, [moviesState]);
	useEffect(() => {
		if (showsState.startsWith("error:")) toast.error(`Ошибка поиска серилов! ${showsState}`);
	}, [showsState]);
	useEffect(() => {
		if (usersState.startsWith("error:")) toast.error(`Ошибка поиска пользователей! ${usersState}`);
	}, [usersState]);

	return (
		<div>
			<div className='bg textureBG' />
			<div className='contentPage'>
				<div className='contentBody header'>
					<h1>Поиск</h1>
					<MDBFormInline
						className='md-form'
						onSubmit={(event) => {
							event.preventDefault();
							history.push("/search/" + document.getElementById("searchInput2").value);
							return false;
						}}>
						<MDBIcon icon='search' />
						<input
							className='form-control form-control-sm ml-3 w-50'
							type='text'
							placeholder='Найти'
							aria-label='Search'
							id='searchInput2'
							value={queryText}
							onChange={(event) => setQueryText(event.target.value)}
						/>
					</MDBFormInline>
					<CategoriesTab
						categories={["Всё", "Игры", "Фильмы", "Сериалы", "Пользователи"]}
						activeCategory={activeCategory}
						onChangeCategory={(category) => {
							setActiveCategory(category);
						}}>
						<LoadingOverlay active={gamesState === "pending"} spinner text='Ищем игры...'>
							<GamesBlock
								games={games}
								gamesPage={gamesPage}
								onPaginate={(page) => {
									setGamesPage(page);
									searchGames(query, page, 6);
								}}
								hidden={activeCategory !== "Всё" && activeCategory !== "Игры"}
							/>
						</LoadingOverlay>

						<LoadingOverlay active={moviesState === "pending"} spinner text='Ищем фильмы...'>
							<MoviesBlock
								movies={movies}
								moviesPage={moviesPage}
								onPaginate={(page) => {
									setMoviesPage(page);
									searchMovies(query, page);
								}}
								hidden={activeCategory !== "Всё" && activeCategory !== "Фильмы"}
							/>
						</LoadingOverlay>

						<LoadingOverlay active={showsState === "pending"} spinner text='Ищем сериалы...'>
							<ShowsBlock
								shows={shows}
								showsPage={showsPage}
								onPaginate={(page) => {
									setShowsPage(page);
									searchShows(query, page);
								}}
								hidden={activeCategory !== "Всё" && activeCategory !== "Сериалы"}
							/>
						</LoadingOverlay>

						<LoadingOverlay active={usersState === "pending"} spinner text='Ищем пользователей...'>
							<UsersBlock users={users} hidden={activeCategory !== "Всё" && activeCategory !== "Пользователи"} />
						</LoadingOverlay>
					</CategoriesTab>
				</div>
			</div>
		</div>
	);
});

export default SearchPage;
