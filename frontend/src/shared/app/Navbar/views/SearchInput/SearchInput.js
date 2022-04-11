import React, { useState } from "react";
import { observer } from "mobx-react";
import { useHistory } from "react-router-dom";
import { MdVideogameAsset, MdLocalMovies, MdLiveTv } from "react-icons/md";
import classnames from "classnames";

import SearchStore from '../../../../../store/SearchStore';

import "./search-input.sass";

const SearchInput = observer(({ onSubmit, className }) => {
	const [query, setQuery] = useState("");
	let history = useHistory();
	const { searchHints, hints } = SearchStore;

	return (
		<form
			onSubmit={(event) => {
				onSubmit(event);
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
					searchHints(event.target.value);
				}}
			/>
			<div className={classnames("search-input__hints", query === "" || !(hints.games.length > 0 || hints.movies.length > 0 || hints.shows.length > 0) ? "search-input__hints_hidden" : "")}>
				<div hidden={!hints.games.length > 0}>
					<MdVideogameAsset />
					{hints.games.map((hint, key) => (
						<a
							key={key}
							href={window.location.origin + "/game/" + hint.rawg_slug}
							className='search-input__hint'
							onClick={(e) => {
								history.push("/game/" + hint.rawg_slug);
								e.preventDefault();
								setQuery("");
							}}>
							{<img src={hint.rawg_backdrop_path} alt={""} />}
							{hint.rawg_name}
							<div>{hint?.rawg_release_date?.substr(0, 4)}</div>
						</a>
					))}
				</div>
				<div hidden={!hints.movies.length > 0}>
					<MdLocalMovies />
					{hints.movies.map((hint, key) => (
						<a
							key={key}
							href={window.location.origin + "/movie/" + hint.tmdb_id}
							className='search-input__hint'
							onClick={(e) => {
								history.push("/movie/" + hint.tmdb_id);
								e.preventDefault();
								setQuery("");
							}}>
							{<img src={hint.tmdb_backdrop_path} alt={""} />}
							{hint.tmdb_name}
							<div>{hint?.tmdb_release_date?.substr(0, 4)}</div>
						</a>
					))}
				</div>
				<div hidden={!hints.shows.length > 0}>
					<MdLiveTv />
					{hints.shows.map((hint, key) => (
						<a
							key={key}
							href={window.location.origin + "/show/" + hint.tmdb_id}
							className='search-input__hint'
							onClick={(e) => {
								history.push("/show/" + hint.tmdb_id);
								e.preventDefault();
								setQuery("");
							}}>
							{<img src={hint.tmdb_backdrop_path} alt={""} />}
							{hint.tmdb_name}
							<div>{hint?.tmdb_release_date?.substr(0, 4)}</div>
						</a>
					))}
				</div>
			</div>
		</form>
	);
});

export default SearchInput;
