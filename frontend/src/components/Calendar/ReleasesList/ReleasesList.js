import React from "react";
import { useHistory } from "react-router-dom";
import { Timeline, TimelineEvent } from "react-event-timeline";
import { MDBIcon } from "mdbreact";

function ReleasesList({ calendar }) {
	let history = useHistory();

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
				{day.movies?.map((movie) => (
					<div key={movie.tmdb_id}>
						Фильм{" "}
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
		);
	}

	function getIconForDay(day) {
		if ((day.games?.length > 0) & !(day.movies?.length > 0) & !(day.episodes?.length > 0)) return <MDBIcon icon='gamepad' />;
		else if ((day.movies?.length > 0) & !(day.games?.length > 0) & !(day.episodes?.length > 0)) return <MDBIcon icon='film' />;
		else if ((day.episodes?.length > 0) & !(day.movies?.length > 0) & !(day.games?.length > 0)) return <MDBIcon icon='tv' />;
		else return <MDBIcon icon='dice-d6' />;
	}

	function dateDiff(date) {
		let now = new Date();
		let time = date.getTime();
		let timeNow = now.getTime();
		let diff = (time - timeNow) / (24 * 3600 * 1000);
		if (diff < 1)
			if (now.getUTCDay() === date.getUTCDay()) return 0;
			else return 1;
		return parseInt(diff) + 1;
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
