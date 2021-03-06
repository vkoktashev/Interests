import React from "react";
import { useHistory } from "react-router-dom";

function DayInfo({ day, date }) {
	let history = useHistory();

	return (
		<div className='dayInfoBlock'>
			<h3 className='dayInfoDate'>
				{date ? date.toLocaleDateString("ru-RU", { year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric", month: "long", day: "numeric", weekday: "long" }) : ""}
			</h3>
			<div className='dayInfoCategory' hidden={!(day?.games?.length > 0)}>
				<h3>Игры</h3>
				{day.games?.map((game) => (
					<div key={game.rawg_id}>
						<a
							href={window.location.origin + "/game/" + game.rawg_slug}
							onClick={(e) => {
								history.push("/game/" + game.rawg_slug);
								e.preventDefault();
							}}>
							{game.rawg_name}
						</a>
					</div>
				))}
			</div>
			<div className='dayInfoCategory' hidden={!(day?.movies?.length > 0)}>
				<h3>Фильмы</h3>
				{day.movies?.map((movie) => (
					<div key={movie.tmdb_id}>
						<a
							href={window.location.origin + "/movie/" + movie.tmdb_id}
							onClick={(e) => {
								history.push("/movie/" + movie.tmdb_id);
								e.preventDefault();
							}}>
							{movie.tmdb_name}
						</a>
					</div>
				))}
			</div>
			<div className='dayInfoCategory' hidden={!(day?.episodes?.length > 0)}>
				<h3>Сериалы</h3>
				{day.episodes?.map((episode) => (
					<div key={episode.tmdb_id}>
						<div style={{ display: "inline-block" }}>
							<a
								href={window.location.origin + "/show/" + episode.tmdb_show.tmdb_id + "/season/" + episode.tmdb_season_number + "/episode/" + episode.tmdb_episode_number}
								onClick={(e) => {
									history.push("/show/" + episode.tmdb_show.tmdb_id + "/season/" + episode.tmdb_season_number + "/episode/" + episode.tmdb_episode_number);
									e.preventDefault();
								}}>
								[s{episode.tmdb_season_number}e{episode.tmdb_episode_number}] серия
							</a>
							&thinsp;сериала&thinsp;
							<a
								href={window.location.origin + "/show/" + episode.tmdb_show.tmdb_id}
								onClick={(e) => {
									history.push("/show/" + episode.tmdb_show.tmdb_id);
									e.preventDefault();
								}}>
								{episode.tmdb_show.tmdb_name}
							</a>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default DayInfo;
