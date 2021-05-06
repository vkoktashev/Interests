function parseGame(game) {
	let newGame = {
		name: game.rawg.name,
		background: game.rawg.background_image_additional ? game.rawg.background_image_additional : game.rawg.background_image,
		poster: game.rawg.background_image,
		metacritic: game.rawg.metacritic,
		overview: game.rawg.description,
		slug: game.rawg.slug,
	};

	if (game.rawg.genres) {
		let newGenres = "";
		for (let i = 0; i < game.rawg.genres.length; i++) {
			newGenres += game.rawg.genres[i].name;
			if (i !== game.rawg.genres.length - 1) newGenres += ", ";
		}
		newGame.genres = newGenres;
	}

	if (game.hltb) {
		newGame.hltb = game.hltb;
	} else if (game.rawg.playtime) {
		newGame.hltb = { gameplay_main_extra: game.rawg.playtime, gameplay_main: -1, gameplay_completionist: -1 };
	} else {
		newGame.hltb = { gameplay_main_extra: -1, gameplay_main: -1, gameplay_completionist: -1 };
	}

	if (game.rawg.developers) {
		let newDevelopers = "";
		for (let i = 0; i < game.rawg.developers.length; i++) {
			newDevelopers += game.rawg.developers[i].name;
			if (i !== game.rawg.developers.length - 1) newDevelopers += ", ";
		}
		newGame.developers = newDevelopers;
	}

	if (game.rawg.platforms) {
		let newPlatforms = "";
		for (let i = 0; i < game.rawg.platforms.length; i++) {
			newPlatforms += game.rawg.platforms[i].platform.name;
			if (i !== game.rawg.platforms.length - 1) newPlatforms += ", ";
		}
		newGame.platforms = newPlatforms;
	}

	if (game.rawg.released) {
		let mas = game.rawg.released.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newGame.date = newDate;
	}
	return newGame;
}

function parseMovie(movie) {
	let newMovie = {
		background: movie.tmdb?.backdrop_path ? "http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + movie.tmdb?.backdrop_path : "",
		poster: movie.tmdb?.poster_path,
		name: movie.tmdb.title,
		originalName: movie.tmdb.original_title,
		runtime: movie.tmdb.runtime,
		tagline: movie.tmdb.tagline,
		tmdbScore: movie.tmdb.vote_average ? movie.tmdb.vote_average * 10 : null,
		overview: movie.tmdb.overview,
		id: movie.tmdb.id,
	};

	if (movie.tmdb.genres) {
		let newGenres = "";
		for (let i = 0; i < movie.tmdb.genres.length; i++) {
			newGenres += movie.tmdb.genres[i].name;
			if (i !== movie.tmdb.genres.length - 1) newGenres += ", ";
		}
		newMovie.genres = newGenres;
	}

	if (movie.tmdb.production_companies) {
		let newCompanies = "";
		for (let i = 0; i < movie.tmdb.production_companies.length; i++) {
			newCompanies += movie.tmdb.production_companies[i].name;
			if (i !== movie.tmdb.production_companies.length - 1) newCompanies += ", ";
		}
		newMovie.companies = newCompanies;
	}

	if (movie.tmdb.cast) {
		let newCast = "";
		let length = movie.tmdb.cast.length > 5 ? 5 : movie.tmdb.cast.length;
		for (let i = 0; i < length; i++) {
			newCast += movie.tmdb.cast[i].name;
			if (i !== length - 1) newCast += ", ";
		}
		newMovie.cast = newCast;
	}

	if (movie.tmdb.crew) {
		let newDirector = "";
		for (let i = 0; i < movie.tmdb.crew.length; i++) {
			if (movie.tmdb.crew[i].job === "Director") {
				newDirector = movie.tmdb.crew[i].name;
				break;
			}
		}
		newMovie.director = newDirector;
	}

	if (movie.tmdb.release_date) {
		let mas = movie.tmdb.release_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newMovie.date = newDate;
	}
	return newMovie;
}

function parseShow(show) {
	let newShow = {
		background: show.tmdb?.backdrop_path ? "http://image.tmdb.org/t/p/w1920_and_h800_multi_faces" + show.tmdb?.backdrop_path : "",
		poster: show.tmdb?.poster_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.poster_path : "",
		name: show.tmdb.name,
		originalName: show.tmdb.original_name,
		episodeRuntime: show.tmdb.episode_run_time.length > 0 ? show.tmdb.episode_run_time : null,
		seasonsCount: show.tmdb.number_of_seasons,
		episodesCount: show.tmdb.number_of_episodes,
		tmdbScore: show.tmdb.vote_average ? show.tmdb.vote_average * 10 : null,
		overview: show.tmdb.overview,
		id: show.tmdb.id,
		seasons: show.tmdb.seasons,
	};

	if (show.tmdb.genres) {
		let newGenres = "";
		for (let i = 0; i < show.tmdb.genres.length; i++) {
			newGenres += show.tmdb.genres[i].name;
			if (i !== show.tmdb.genres.length - 1) newGenres += ", ";
		}
		newShow.genres = newGenres;
	}

	if (show.tmdb.production_companies) {
		let newCompanies = "";
		for (let i = 0; i < show.tmdb.production_companies.length; i++) {
			newCompanies += show.tmdb.production_companies[i].name;
			if (i !== show.tmdb.production_companies.length - 1) newCompanies += ", ";
		}
		newShow.companies = newCompanies;
	}

	switch (show.tmdb.status) {
		case "Ended":
			newShow.showStatus = "Окончен";
			break;
		case "Returning Series":
			newShow.showStatus = "Продолжается";
			break;
		case "Pilot":
			newShow.showStatus = "Пилот";
			break;
		case "Canceled":
			newShow.showStatus = "Отменен";
			break;
		case "In Production":
			newShow.showStatus = "В производстве";
			break;
		case "Planned":
			newShow.showStatus = "Запланирован";
			break;
		default:
			newShow.showStatus = show.tmdb.status;
	}

	if (show.tmdb.first_air_date) {
		let mas = show.tmdb.first_air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.firstDate = newDate;
	}

	if (show.tmdb.last_air_date) {
		let mas = show.tmdb.last_air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.lastDate = newDate;
	}
	return newShow;
}

function parseSeason(show) {
	let newShow = {
		background: show.tmdb?.show?.tmdb_backdrop_path,
		poster: show.tmdb?.poster_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.poster_path : "",
		showName: show.tmdb.show.tmdb_name,
		showOriginalName: show.tmdb.show.tmdb_original_name,
		name: show.tmdb.name,
		seasonNumber: show.tmdb.season_number,
		overview: show.tmdb.overview,
		episodes: show.tmdb.episodes,
		episodesCount: show.tmdb.episodes ? show.tmdb.episodes.length : 0,
		id: show.tmdb.id,
		tmdbScore: show.tmdb.vote_average ? show.tmdb.vote_average * 10 : null,
	};

	if (show.tmdb.air_date) {
		let mas = show.tmdb.air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.date = newDate;
	}
	return newShow;
}

function parseEpisode(show) {
	let newShow = {
		background: show.tmdb?.show?.tmdb_backdrop_path,
		poster: show.tmdb?.still_path ? "http://image.tmdb.org/t/p/w600_and_h900_bestv2" + show.tmdb?.still_path : "",
		showName: show.tmdb.show.tmdb_name,
		showOriginalName: show.tmdb.show.tmdb_original_name,
		name: show.tmdb.name,
		seasonNumber: show.tmdb.season_number,
		episodeNumber: show.tmdb.episode_number,
		episodesCount: show.tmdb.episodes ? show.tmdb.episodes.length : 0,
		overview: show.tmdb.overview,
		id: show.tmdb.id,
	};

	if (show.tmdb.air_date) {
		let mas = show.tmdb.air_date.split("-");
		let newDate = mas[2] + "." + mas[1] + "." + mas[0];
		newShow.date = newDate;
	}
	return newShow;
}
