import React from "react";
import "./day-info.scss";
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW, ROUTE_SHOW_EPISODE} from '../../../index';

function DayInfo({ day, date }) {
	return (
		<div className='day-info'>
			<h2 className='day-info__date'>
				{date ? date.toLocaleDateString("ru-RU", { year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric", month: "long", day: "numeric", weekday: "long" }) : ""}
			</h2>
			<div className='day-info__category' hidden={!(day?.games?.length > 0)}>
				<h3 className='day-info__category-header'>Игры</h3>
				{day.games?.map((game) => (
					<div key={game.rawg_id}>
						<Link
							className='day-info__link'
							toRoute={ROUTE_GAME}
							toRouteParams={{
								gameId: game.rawg_slug,
							}}>
							{game.rawg_name}
						</Link>
					</div>
				))}
			</div>
			<div className='day-info__category' hidden={!(day?.movies?.length > 0)}>
				<h3 className='day-info__category-header'>Фильмы</h3>
				{day.movies?.map((movie) => (
					<div key={movie.tmdb_id}>
						<Link
							className='day-info__link'
							toRoute={ROUTE_MOVIE}
							toRouteParams={{
								movieId: movie.tmdb_id,
							}}>
							{movie.tmdb_name}
						</Link>
					</div>
				))}
			</div>
			<div className='day-info__category' hidden={!(day?.episodes?.length > 0)}>
				<h3 className='day-info__category-header'>Сериалы</h3>
				{day.episodes?.map((episode) => (
					<div key={episode.tmdb_id}>
						<div style={{ display: "inline-block" }}>
							<Link
								className='day-info__link'
								toRoute={ROUTE_SHOW_EPISODE}
								toRouteParams={{
									showId: episode.tmdb_show.tmdb_id,
									showSeasonId: episode.tmdb_season_number,
									showEpisodeId: episode.tmdb_episode_number,
								}}>
								[s{episode.tmdb_season_number}e{episode.tmdb_episode_number}] серия
							</Link>
							&thinsp;сериала&thinsp;
							<Link
								className='day-info__link'
								toRoute={ROUTE_SHOW}
								toRouteParams={{
									showId: episode.tmdb_show.tmdb_id,
								}}>
								{episode.tmdb_show.tmdb_name}
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export default DayInfo;
