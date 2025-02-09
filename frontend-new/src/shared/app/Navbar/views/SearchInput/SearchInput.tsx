import React, {useCallback, useEffect, useState} from 'react';
import { MdVideogameAsset, MdLocalMovies, MdLiveTv } from "react-icons/md";
import classnames from "classnames";
import {useComponents, useDispatch} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW} from '../../../../../routes';
import "./search-input.scss";

export function SearchInput({ onSubmit, className }) {
	const [query, setQuery] = useState("");
	const dispatch = useDispatch();
	const {http} = useComponents();

	const [hints, setHints] = useState({
		games: [],
		movies: [],
		shows: [],
	});

	const fetchGamesHints = useCallback((query: string) => {
		http.get('/games/search/', {
			query,
		}).then(response => {
			setHints(prevState => ({
				...prevState,
				games: response,
			}));
		});
	}, []);

	const fetchMoviesHints = useCallback((query: string) => {
		http.get('/movies/search/', {
			query,
		}).then(response => {
			setHints(prevState => ({
				...prevState,
				movies: response,
			}));
		});
	}, []);

	const fetchShowsHints = useCallback((query: string) => {
		http.get('/shows/search/', {
			query,
		}).then(response => {
			setHints(prevState => ({
				...prevState,
				shows: response,
			}));
		});
	}, []);

	const fetchHints = useCallback((query: string) => {
		fetchGamesHints(query);
		fetchMoviesHints(query);
		fetchShowsHints(query);
	}, []);

	useEffect(() => {
		fetchHints(query);
	}, [query]);

	return (
		<form
			onSubmit={(event) => {
				onSubmit(event, query);
				setQuery("");
			}}
			className={classnames("search-input", className)}>
			<input
				type='text'
				placeholder='Поиск'
				aria-label='Поиск'
				className='search-input__input'
				id='searchInput'
				value={query}
				onChange={(event) => {
					setQuery(event.target.value);
				}}
			/>
			<div className={classnames("search-input__hints", query === "" || !(hints.games?.length > 0 || hints.movies?.length > 0 || hints.shows?.length > 0) ? "search-input__hints_hidden" : "")}>
				<div hidden={!hints.games?.length}>
					<MdVideogameAsset />
					{hints.games?.map((hint, key) => (
						<a
							key={key}
							href={window.location.origin + "/game/" + hint.rawg_slug}
							className='search-input__hint'
							onClick={(e) => {
								dispatch(goToRoute(ROUTE_GAME, {
									gameId: hint.rawg_slug,
								}));
								e.preventDefault();
								setQuery("");
							}}>
							{hint.rawg_name}
							<div>{hint?.rawg_release_date?.substr(0, 4)}</div>
						</a>
					))}
				</div>
				<div hidden={!hints.movies?.length}>
					<MdLocalMovies />
					{hints.movies?.map((hint, key) => (
						<a
							key={key}
							href={window.location.origin + "/movie/" + hint.tmdb_id}
							className='search-input__hint'
							onClick={(e) => {
								dispatch(goToRoute(ROUTE_MOVIE, {
									movieId: hint.tmdb_id,
								}));
								e.preventDefault();
								setQuery("");
							}}>
							{hint.tmdb_name}
							<div>{hint?.tmdb_release_date?.substr(0, 4)}</div>
						</a>
					))}
				</div>
				<div hidden={!hints.shows?.length}>
					<MdLiveTv />
					{hints.shows?.map((hint, key) => (
						<a
							key={key}
							href={window.location.origin + "/show/" + hint.tmdb_id}
							className='search-input__hint'
							onClick={(e) => {
								dispatch(goToRoute(ROUTE_SHOW, {
									showId: hint.tmdb_id,
								}));
								e.preventDefault();
								setQuery("");
							}}>
							{hint.tmdb_name}
							<div>{hint?.tmdb_release_date?.substr(0, 4)}</div>
						</a>
					))}
				</div>
			</div>
		</form>
	);
}

export default SearchInput;
