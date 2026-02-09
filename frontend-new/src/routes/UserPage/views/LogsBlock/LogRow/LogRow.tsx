import React from "react";
import {useBem, useSelector} from '@steroidsjs/core/hooks';
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
import {getUser} from '@steroidsjs/core/reducers/auth';

function LogRow({ log, showUsername, onDeleteLog, className }) {
	const bem = useBem('log-row');
	const isOwnLog = useSelector(state => getUser(state)?.username === log.user);

	const actionText = translateActionType(log.action_type, log.action_result, log.type);
	const typeText = translateType(log.type, log.action_type);
	const targetNode = nameToLink(log.target, log.type, log.target_id, bem);
	const userNode = showUsername ? userToLink(log.user, log.user_id, bem) : null;
	const timeText = formatTime(log.created);
	const resultNode = actionResultToStr(log.action_type, log.action_result, log.type);
	const showSeparator = !(
		(log.type === "user")
		|| (log.action_type === "episodes")
		|| (log.action_result === "0")
		|| (log.action_result === "-1")
	);

	return (
		<div className={bem(bem.block(), className)}>
			<div className={bem.element('time')}>{timeText}</div>
			<div className={bem.element('content')}>
				{userNode && <span className={bem.element('user')}>{userNode}</span>}
				<span className={bem.element('action')}>{actionText}</span>
				{typeText && <span className={bem.element('type')}>{typeText}</span>}
				<span className={bem.element('target')}>{targetNode}</span>
				{showSeparator && <span className={bem.element('separator')}>:</span>}
				{resultNode && <span className={bem.element('result')}>{resultNode}</span>}
			</div>
			<button
				className={bem.element('delete-button', {hidden: !isOwnLog})}
				onClick={() => {
					onDeleteLog(log.type, log.id);
				}}>
				<span className={bem.element('delete-icon')}>×</span>
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

function translateActionType(action, actionResult, logType) {
	switch (action) {
		case 'score':
			switch (actionResult) {
				case '0':
					if (logType !== 'episode') {
						return 'оценил(а)';
					}
					return 'посмотрел(а)';
				case '-1':
					return 'не смотрела(а)';
				default:
					return "оценил(а)";
			}
		case "status":
			return "изменил(а) статус";
		case "review":
			return "оставил(а) отзыв на";
		case "spent_time":
			return "изменил(а) время прохождения";
		case "episodes": {
			const count = Number(actionResult);
			if (count > 0) return `посмотрел(а) ${count} серий`;
			return `не смотрел(а) ${Math.abs(count)} серий`;
		}
		case "is_following":
			if (actionResult === "True") return "подписан(а) на";
			return "отписан(а) от";
		default:
			return action;
	}
}

function translateType(type, actionType) {
	switch (type) {
		case "game":
			if (actionType === "score" || actionType === "review") return "игру";
			return "игры";
		case "movie":
			if (actionType === "score" || actionType === "review") return "фильм";
			return "фильма";
		case "show":
			if (actionType === "score" || actionType === "review") return "сериал";
			return "сериала";
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

function nameToLink(name, type, id, bem) {
	switch (type) {
		case "game":
			return (
				<Link
					toRoute={ROUTE_GAME}
					toRouteParams={{
						gameId: id,
					}}
					className={bem.element('link')}>
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
					className={bem.element('link')}>
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
					className={bem.element('link')}>
					{name}
				</Link>
			);
		case "season":
			return (
				<span className={bem.element('inline')}>
					<Link
						toRoute={ROUTE_SHOW_SEASON}
						toRouteParams={{
							showId: id.show_id,
							showSeasonId: id.season_number,
						}}
						className={bem.element('link')}>
						{name.name}
					</Link>
					<span className={bem.element('muted')}>сериала</span>
					<Link
						toRoute={ROUTE_SHOW}
						toRouteParams={{
							showId: id.show_id,
						}}
						className={bem.element('link')}>
						{name.parent_name}
					</Link>
				</span>
			);
		case "episode":
			return (
				<span className={bem.element('inline')}>
					<Link
						toRoute={ROUTE_SHOW_EPISODE}
						toRouteParams={{
							showId: id.show_id,
							showSeasonId: id.season_number,
							showEpisodeId: id.episode_number,
						}}
						className={bem.element('link')}>
						[s{id.season_number}e{id.episode_number}] серию
					</Link>
					<span className={bem.element('muted')}>сериала</span>
					<Link
						toRoute={ROUTE_SHOW}
						toRouteParams={{
							showId: id.show_id,
						}}
						className={bem.element('link')}>
						{name.parent_name}
					</Link>
				</span>
			);
		case "user":
			return (
				<Link
					toRoute={ROUTE_USER}
					toRouteParams={{
						userId: id,
					}}
					className={bem.element('link')}>
					{name}
				</Link>
			);
		default:
			return name;
	}
}

function userToLink(username, userID, bem) {
	return (
		<Link
			toRoute={ROUTE_USER}
			toRouteParams={{
				userId: userID,
			}}
			className={bem.element('link')}>
			{username}
		</Link>
	);
}

function actionResultToStr(actionType, actionResult, target) {
	const actionResultNumber = Number(actionResult);
	switch (actionType) {
		case "score":
			if ((target !== "episode") || (actionResultNumber > 0)) {
				return <Rating initialRating={actionResultNumber} readonly={true} />;
			}
			return "";
		case "status":
			return `"${actionResult}"`;
		case "review":
			return `"${actionResult}"`;
		case "spent_time":
			return `${actionResultNumber} ${intToHours(actionResultNumber)}`;
		case "episodes":
			return "";
		case "is_following":
			return "";
		default:
			return actionResult;
	}
}

function formatTime(date) {
	const newDate = new Date(date);
	const options = { hour: "numeric", minute: "numeric" };
	return newDate.toLocaleTimeString("ru-RU", options as any);
}

export default LogRow;
