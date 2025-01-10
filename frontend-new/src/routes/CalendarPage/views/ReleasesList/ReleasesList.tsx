import React from "react";
import { Timeline, TimelineEvent } from "react-event-timeline";
import { MdVideogameAsset, MdLocalMovies, MdLiveTv, MdApps } from "react-icons/md";
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_GAME, ROUTE_MOVIE, ROUTE_SHOW, ROUTE_SHOW_EPISODE} from '../../../index';

function ReleasesList({ calendar }) {
	const myStyle = {
		backgroundColor: "#191A1B",
		color: "#F1F1FB",
		border: "none",
	};

	function getContentForDay(day) {
		return (
			<div>
				{day.games?.map((game) => (
					<div key={game.rawg_id}>
						Игра{" "}
						<Link
							toRoute={ROUTE_GAME}
							toRouteParams={{
								gameId: game.rawg_slug,
							}}>
							{game.rawg_name}
						</Link>
					</div>
				))}
				{day.movies?.map((movie) => (
					<div key={movie.tmdb_id}>
						Фильм{" "}
						<Link
							toRoute={ROUTE_MOVIE}
							toRouteParams={{
								movieId: movie.tmdb_id,
							}}>
							{movie.tmdb_name}
						</Link>
					</div>
				))}
				{day.episodes?.map((episode) => (
					<div key={episode.tmdb_id}>
						<div style={{ display: "inline-block" }}>
							<Link
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
		);
	}

	function getIconForDay(day) {
		if ((day.games?.length > 0) && !(day.movies?.length > 0) && !(day.episodes?.length > 0)) {
			return <MdVideogameAsset />
		} else if ((day.movies?.length > 0) && !(day.games?.length > 0) && !(day.episodes?.length > 0)) {
			return <MdLocalMovies />
		} else if ((day.episodes?.length > 0) && !(day.movies?.length > 0) && !(day.games?.length > 0)) {
			return <MdLiveTv />
		} else {
			return <MdApps />;
		}
	}

	function dateDiff(date) {
		let now = new Date();
		let time = date.getTime();
		let timeNow = now.getTime();
		let diff = (time - timeNow) / (24 * 3600 * 1000);
		if (diff < 1)
			if (now.getUTCDay() === date.getUTCDay()) return 0;
			else return 1;
		return parseInt(diff as any) + 1;
	}

	function intToDays(number) {
		if (11 <= number && number <= 14) return "дней";
		else if (number % 10 === 1) return "день";
		else if (2 <= number % 10 && number % 10 <= 4) return "дня";
		else return "дней";
	}

	function remainedDays(date) {
		let days = dateDiff(date);
		if (days > 0) return `${days} ${intToDays(days)}`;
		else return "сегодня";
	}

	return (
		<Timeline style={myStyle} lineColor='#A6A6AB'>
			{calendar?.map((day) => {
				let date = new Date(day[0]);
				return (
					<TimelineEvent
						title={`${remainedDays(date)}, ${date.toLocaleDateString("ru-RU", {
							year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
							month: "long",
							day: "numeric",
							weekday: "long",
						})}`}
						key={day[0]}
						className='timelineEvent'
						icon={getIconForDay(day[1])}
						cardHeaderStyle={myStyle}
						iconStyle={{ ...myStyle, fontSize: "1.2rem" }}
						bubbleStyle={myStyle}
						contentStyle={{ ...myStyle, fontSize: "1.1rem", marginTop: "0.2rem", marginBottom: "0.2rem" }}
						titleStyle={{ ...myStyle, fontSize: "1.1rem" }}
						subtitleStyle={myStyle}>
						{getContentForDay(day[1])}
					</TimelineEvent>
				);
			})}
		</Timeline>
	);
}

export default ReleasesList;
