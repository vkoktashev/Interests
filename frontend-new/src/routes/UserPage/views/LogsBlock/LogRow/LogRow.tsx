import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import Rating from '../../../../../shared/Rating';
import "./log-row.scss";
import {Link} from '@steroidsjs/core/ui/nav';
import {
	ROUTE_GAME,
	ROUTE_MOVIE,
	ROUTE_SHOW,
	ROUTE_SHOW_EPISODE,
	ROUTE_SHOW_SEASON,
	ROUTE_USER
} from '../../../../index';

function LogRow({ log, showUsername, onDeleteLog, className }) {
	const bem = useBem('log-row');

	function translateActionType(action, actionResult, logType) {
		switch (action) {
			case "score":
				switch (actionResult) {
					case "0":
						if (logType !== 'episode') {
							return 'оценил(а)';
						}
						return "посмотрел(а)";
					case "-1":
						return "не смотрела(а)";
					default:
						return "оценил(а)";
				}
			case "status":
				return "изменил(а) статус";
			case "review":
				return "оставил(а) отзыв на";
			case "spent_time":
				return "изменил(а) время прохождения";
			case "episodes":
				if (actionResult > 0) return "посмотрел(а) " + actionResult + " серий";
				else return "не смотрел(а) " + actionResult * -1 + " серий";
			case "is_following":
				if (actionResult === "True") return "подписан(а) на";
				else return "отписан(а) от";
			default:
				return action;
		}
	}

	function translateType(type, actionType) {
		switch (type) {
			case "game":
				if (actionType === "score" || actionType === "review") return "игру";
				else return "игры";
			case "movie":
				if (actionType === "score" || actionType === "review") return "фильм";
				else return "фильма";
			case "show":
				if (actionType === "score" || actionType === "review") return "сериал";
				else return "сериала";
			case "season":
				return "";
			case "episode":
				return "";
			case "user":
				return "пользователя";
			default:
				return type;
		}
	}

	function nameToLink(name, type, id) {
		switch (type) {
			case "game":
				return (
					<Link
						toRoute={ROUTE_GAME}
						toRouteParams={{
							gameId: id,
						}}
						className='log-row__link'>
						{name}
					</Link>
				);
			case "movie":
				return (
					<Link
						toRoute={ROUTE_MOVIE}
						toRouteParams={{
							movieId: id,
						}}
						className='log-row__link'>
						{name}
					</Link>
				);
			case "show":
				return (
					<Link
						toRoute={ROUTE_SHOW}
						toRouteParams={{
							showId: id,
						}}
						className='log-row__link'>
						{name}
					</Link>
				);
			case "season":
				return (
					<div style={{ display: "inline-block" }}>
						<Link
							toRoute={ROUTE_SHOW_SEASON}
							toRouteParams={{
								showId: id.show_id,
								showSeasonId: id.season_number,
							}}
							className='log-row__link'>
							{name.name}
						</Link>
						&thinsp;сериала&thinsp;
						<Link
							toRoute={ROUTE_SHOW}
							toRouteParams={{
								showId: id.show_id,
							}}
							className='log-row__link'>
							{name.parent_name}
						</Link>
					</div>
				);
			case "episode":
				return (
					<div style={{ display: "inline-block" }}>
						<Link
							toRoute={ROUTE_SHOW_EPISODE}
							toRouteParams={{
								showId: id.show_id,
								showSeasonId: id.season_number,
								showEpisodeId: id.episode_number,
							}}
							className='log-row__link'>
							[s{id.season_number}e{id.episode_number}] серию
						</Link>
						&thinsp;сериала&thinsp;
						<Link
							toRoute={ROUTE_SHOW}
							toRouteParams={{
								showId: id.show_id,
							}}
							className='log-row__link'>
							{name.parent_name}
						</Link>
					</div>
				);
			case "user":
				return (
					<Link
						toRoute={ROUTE_USER}
						toRouteParams={{
							userId: id,
						}}
						className='log-row__link'>
						{name}
					</Link>
				);
			default:
				return name;
		}
	}

	function userToLink(username, userID) {
		return (
			<Link
				toRoute={ROUTE_USER}
				toRouteParams={{
					userId: userID,
				}}
				className='log-row__link'>
				{username}
			</Link>
		);
	}

	function actionResultToStr(actionType, actionResult, target) {
		switch (actionType) {
			case "score":
				if ((target !== "episode") || (actionResult > 0)) {
					return <Rating initialRating={actionResult} readonly={true} />;
				} else {
					return "";
				}
			case "status":
				return '"' + actionResult + '"';
			case "review":
				return '"' + actionResult + '"';
			case "spent_time":
				return actionResult + " " + intToHours(actionResult);
			case "episodes":
				return "";
			case "is_following":
				return "";
			default:
				return actionResult;
		}
	}

	function parseDate(date) {
		let newDate = new Date(date);
		let options = { hour: "numeric", minute: "numeric" };
		return newDate.toLocaleTimeString("ru-RU", options as any);
	}

	return (
		<div className={bem(bem.block(), className)}>
			{parseDate(log.created)}&thinsp;
			{showUsername ? userToLink(log.user, log.user_id) : ""}&thinsp;
			{translateActionType(log.action_type, log.action_result, log.type)}&thinsp;
			{translateType(log.type, log.action_type)}&thinsp;
			{nameToLink(log.target, log.type, log.target_id)}
			{
				(log.type === "user")
				|| (log.action_type === "episodes")
				|| (log.action_result === "0")
				|| (log.action_result === "-1")
					? ""
					: ":"
			}
			&thinsp;
			{actionResultToStr(log.action_type, log.action_result, log.type)}
			<button
				className={bem.element('delete-button', {hidden: showUsername})}
				onClick={(event) => {
					onDeleteLog(log.type, log.id);
				}}>
				x
			</button>
		</div>
	);
}

function intToHours(number) {
	if (11 <= number && number <= 14) return "часов";
	else if (number % 10 === 1) return "час";
	else if (2 <= number % 10 && number % 10 <= 4) return "часа";
	else return "часов";
}

export default LogRow;
