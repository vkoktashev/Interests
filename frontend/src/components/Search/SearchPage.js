import React, { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { observer } from "mobx-react";
import SearchStore from "../../store/SearchStore";

import { MDBRow, MDBCol, MDBContainer, MDBIcon, MDBFormInline } from "mdbreact";
import "./style.css";

import LoadingOverlay from "react-loading-overlay";

import CardGame from "./CardGame";
import CardMovie from "./CardMovie";
import CardShow from "./CardShow";
import CardUser from "../Common/CardUser";
import CategoriesTab from "../Common/CategoriesTab";

/**
 * Основная страница приложения
 */
const SearchPage = observer((props) => {
	const { gamesState, searchGames, games, moviesState, searchMovies, movies, showsState, searchShows, shows, usersState, searchUsers, users } = SearchStore;

	let history = useHistory();
	let { query } = useParams();
	const [queryText, setQueryText] = useState("");
	const [gamesCards, setGamesCards] = useState("");
	const [moviesCards, setMoviesCards] = useState("");
	const [showsCards, setShowsCards] = useState("");
	const [usersCards, setUsersCards] = useState("");
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
		[query, searchGames, searchMovies, searchUsers, searchShows]
	);

	useEffect(() => {
		setGamesCards(
			<div className='searchCardsGroup'>
				{games.map((game) => (
					<CardGame game={game} key={game.id} />
				))}
			</div>
		);
	}, [games]);

	useEffect(() => {
		setMoviesCards(
			<div className='searchCardsGroup'>
				{movies.map((movie) => (
					<CardMovie movie={movie} key={movie.id} />
				))}
			</div>
		);
	}, [movies]);

	useEffect(() => {
		setShowsCards(
			<div className='searchCardsGroup'>
				{shows.map((show) => (
					<CardShow show={show} key={show.id} />
				))}
			</div>
		);
	}, [shows]);

	useEffect(() => {
		setUsersCards(
			<div className='searchCardsGroup'>
				{users.map((user) => (
					<CardUser user={user} key={user.username} />
				))}
			</div>
		);
	}, [users]);

	return (
		<div>
			<div className='bg searchBG' />
			<MDBContainer>
				<MDBRow>
					<MDBCol md='0.5'></MDBCol>
					<MDBCol className='searchPage'>
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

						<h1>Результаты поиска</h1>
						<CategoriesTab
							categories={["Всё", "Игры", "Фильмы", "Сериалы", "Пользователи"]}
							activeColor='#7654de'
							activeCategory={activeCategory}
							onChangeCategory={(category) => {
								setActiveCategory(category);
							}}
						/>

						<LoadingOverlay active={gamesState === "pending"} spinner text='Ищем игры...'>
							<div hidden={activeCategory !== "Всё" && activeCategory !== "Игры"}>
								<h3>Игры</h3>
								<div className='reslutsBlock'>
									<button
										className='paginationButton'
										disabled={gamesPage === 1}
										onClick={() => {
											searchGames(query, gamesPage - 1, 6);
											setGamesPage(gamesPage - 1);
										}}>
										&lt;
									</button>
									{gamesCards}
									<button
										className='paginationButton'
										disabled={games.length < 6}
										onClick={() => {
											searchGames(query, gamesPage + 1, 6);
											setGamesPage(gamesPage + 1);
										}}>
										&gt;
									</button>
								</div>
							</div>
						</LoadingOverlay>

						<LoadingOverlay active={moviesState === "pending"} spinner text='Ищем фильмы...'>
							<div hidden={activeCategory !== "Всё" && activeCategory !== "Фильмы"}>
								<h3>Фильмы</h3>
								<div className='reslutsBlock'>
									<button
										className='paginationButton'
										disabled={moviesPage === 1}
										onClick={() => {
											searchMovies(query, moviesPage - 1);
											setMoviesPage(moviesPage - 1);
										}}>
										&lt;
									</button>
									{moviesCards}
									<button
										className='paginationButton'
										disabled={movies.length < 20}
										onClick={() => {
											searchMovies(query, moviesPage + 1);
											setMoviesPage(moviesPage + 1);
										}}>
										&gt;
									</button>
								</div>
							</div>
						</LoadingOverlay>

						<LoadingOverlay active={showsState === "pending"} spinner text='Ищем сериалы...'>
							<div hidden={activeCategory !== "Всё" && activeCategory !== "Сериалы"}>
								<h3>Сериалы</h3>
								<div className='reslutsBlock'>
									<button
										className='paginationButton'
										disabled={showsPage === 1}
										onClick={() => {
											searchShows(query, showsPage - 1);
											setShowsPage(showsPage - 1);
										}}>
										&lt;
									</button>
									{showsCards}
									<button
										className='paginationButton'
										disabled={shows.length < 20}
										onClick={() => {
											searchShows(query, showsPage + 1);
											setShowsPage(showsPage + 1);
										}}>
										&gt;
									</button>
								</div>
							</div>
						</LoadingOverlay>

						<LoadingOverlay active={usersState === "pending"} spinner text='Ищем пользователей...'>
							<div hidden={activeCategory !== "Всё" && activeCategory !== "Пользователи"}>
								<h3>Пользователи</h3>
								{usersCards}
							</div>
						</LoadingOverlay>
					</MDBCol>
					<MDBCol md='0.5'></MDBCol>
				</MDBRow>
			</MDBContainer>
		</div>
	);
});

export default SearchPage;
