import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import SearchStore from "../../store/SearchStore";
import { useHistory } from "react-router-dom";
import { MDBIcon } from "mdbreact";

const SearchInput = observer(({ onSubmit }) => {
	const [query, setQuery] = useState("");
	let history = useHistory();
	const { searchHints, hints } = SearchStore;

	useEffect(() => {
		console.log("ЖОПА");
	}, [hints]);

	return (
		<form onSubmit={onSubmit}>
			<div className='searchInputDiv'>
				<input
					type='text'
					placeholder='Поиск'
					aria-label='Поиск'
					id='searchInput'
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						searchHints(event.target.value);
					}}
				/>
				<div className='searchHints' hidden={query === "" || !(hints.games.length > 0 || hints.movies.length > 0 || hints.shows.length > 0)}>
					<div hidden={!hints.games.length > 0}>
						<MDBIcon icon='gamepad' />
						{hints.games.map((hint) => (
							<a
								key={hint.rawg_slug}
								href={window.location.origin + "/game/" + hint.rawg_slug}
								className='searchHint'
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
						<MDBIcon icon='film' />
						{hints.movies.map((hint) => (
							<a
								key={hint.rawg_slug}
								href={window.location.origin + "/movie/" + hint.tmdb_id}
								className='searchHint'
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
						<MDBIcon icon='tv' />
						{hints.shows.map((hint) => (
							<a
								key={hint.rawg_slug}
								href={window.location.origin + "/show/" + hint.tmdb_id}
								className='searchHint'
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
			</div>
		</form>
	);
});

export default SearchInput;
