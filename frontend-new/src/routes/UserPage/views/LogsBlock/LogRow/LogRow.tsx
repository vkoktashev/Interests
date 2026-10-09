import React, {useState} from "react";
import {useBem, useSelector} from '@steroidsjs/core/hooks';
import formatHours from '../../../../../shared/formatHours';
import "./log-row.scss";
import {Link} from '@steroidsjs/core/ui/nav';
import {MdLocalMovies, MdLiveTv, MdPerson, MdVideogameAsset} from 'react-icons/md';
import {
	ROUTE_GAME,
	ROUTE_MOVIE,
	ROUTE_PERSON,
	ROUTE_SHOW,
	ROUTE_SHOW_EPISODE,
	ROUTE_SHOW_SEASON,
	ROUTE_USER
} from '../../../../index';
import {getUser} from '@steroidsjs/core/reducers/auth';

function LogRow({ log, grouped = false, onDeleteLog, className }) {
	const bem = useBem('log-row');
	const isOwnLog = useSelector(state => getUser(state)?.username === log.user);
	const gender = normalizeGender(log.user_gender);

	const actionText = translateActionType(log.action_type, log.action_result, log.type, gender);
	const typeText = translateType(log.type, log.action_type, log.action_result);
	const targetNode = nameToLink(log.target, log.type, log.target_id, bem);
	const timeText = formatTime(log.created);
	const resultNode = actionResultToStr(log.action_type, log.action_result, log.type, bem);
	const showSeparator = !(
		(log.type === "user")
		|| (log.type === "person")
		|| (log.action_type === "status")
		|| (log.action_type === "episodes")
		|| (log.action_result === "0")
		|| (log.action_result === "-1")
	);

	return (
		<div className={bem(bem.block({grouped}), className)}>
			<div className={bem.element('time')}>{timeText}</div>
			<LogMedia log={log} bem={bem} />
			<div className={bem.element('details')}>
				<div className={bem.element('content')}>
					<span className={bem.element('action')}>{actionText}</span>
					{typeText && (
						<>
							{' '}<span className={bem.element('type')}>{typeText}</span>
						</>
					)}
					{' '}<span className={bem.element('target')}>{targetNode}</span>
					{showSeparator && <span className={bem.element('separator')}>:</span>}
					{resultNode && (
						<>
							{' '}<span className={bem.element('result')}>{resultNode}</span>
						</>
					)}
				</div>
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

function LogMedia({log, bem}) {
	const [imageAvailable, setImageAvailable] = useState(Boolean(log.cover_url));
	const route = getTargetRoute(log.type, log.target_id);
	const cover = imageAvailable
		? (
			<img
				className={bem.element('cover')}
				src={log.cover_url}
				alt={getTargetName(log.target)}
				loading='lazy'
				onError={() => setImageAvailable(false)}
			/>
		)
		: (
			<span className={bem.element('cover-placeholder', {[log.type]: true})} aria-hidden='true'>
				{getLogTypeIcon(log.type)}
			</span>
		);

	return (
		<div className={bem.element('media')}>
			{route ? (
				<Link
					toRoute={route.name}
					toRouteParams={route.params}
					className={bem.element('cover-link')}
				>
					{cover}
				</Link>
			) : cover}
		</div>
	);
}

function getTargetRoute(type, id) {
	switch (type) {
		case 'game':
			return {name: ROUTE_GAME, params: {gameId: id}};
		case 'movie':
			return {name: ROUTE_MOVIE, params: {movieId: id}};
		case 'show':
			return {name: ROUTE_SHOW, params: {showId: id}};
		case 'season':
			return {name: ROUTE_SHOW_SEASON, params: {showId: id.show_id, showSeasonId: id.season_number}};
		case 'episode':
			return {
				name: ROUTE_SHOW_EPISODE,
				params: {
					showId: id.show_id,
					showSeasonId: id.season_number,
					showEpisodeId: id.episode_number,
				},
			};
		case 'user':
			return {name: ROUTE_USER, params: {userId: id}};
		case 'person':
			return {name: ROUTE_PERSON, params: {personId: id}};
		default:
			return null;
	}
}

function getTargetName(target) {
	if (target && typeof target === 'object') {
		return target.name || target.parent_name || '';
	}
	return target || '';
}

function getLogTypeIcon(type) {
	if (type === 'game') return <MdVideogameAsset />;
	if (type === 'movie') return <MdLocalMovies />;
	if (type === 'show' || type === 'season' || type === 'episode') return <MdLiveTv />;
	return <MdPerson />;
}

function intToSeries(number) {
	if (11 <= number % 100 && number % 100 <= 14) return "серий";
	if (number % 10 === 1) return "серию";
	if (2 <= number % 10 && number % 10 <= 4) return "серии";
	return "серий";
}

function intToSeasonsInEpisodeContext(number) {
	return number === 1 ? "сезона" : "сезона";
}

function intToEpisodeInLogContext(number) {
	return `${number} серию`;
}

function normalizeGender(gender) {
	return gender === 'female' ? 'female' : 'male';
}

function getGenderText(gender, forms) {
	return normalizeGender(gender) === 'female' ? forms.female : forms.male;
}

function getStatusActionText(actionResult, logType, gender) {
	switch (logType) {
		case 'game':
			switch (actionResult) {
				case 'Буду играть':
					return 'будет играть в';
				case 'Играю':
					return 'играет в';
				case 'Прошел':
					return getGenderText(gender, {male: 'прошел', female: 'прошла'});
				case 'Дропнул':
					return getGenderText(gender, {male: 'забросил', female: 'забросила'});
				case 'Не играл':
					return getGenderText(gender, {male: 'не играл в', female: 'не играла в'});
				default:
					return getGenderText(gender, {male: 'обновил статус', female: 'обновила статус'});
			}
		case 'movie':
			switch (actionResult) {
				case 'Буду смотреть':
					return 'будет смотреть';
				case 'Посмотрел':
					return getGenderText(gender, {male: 'посмотрел', female: 'посмотрела'});
				case 'Дропнул':
					return getGenderText(gender, {male: 'перестал смотреть', female: 'перестала смотреть'});
				case 'Не смотрел':
					return getGenderText(gender, {male: 'не смотрел', female: 'не смотрела'});
				default:
					return getGenderText(gender, {male: 'обновил статус', female: 'обновила статус'});
			}
		case 'show':
			switch (actionResult) {
				case 'Буду смотреть':
					return 'будет смотреть';
				case 'Смотрю':
					return 'смотрит';
				case 'Посмотрел':
					return getGenderText(gender, {male: 'посмотрел', female: 'посмотрела'});
				case 'Дропнул':
					return getGenderText(gender, {male: 'перестал смотреть', female: 'перестала смотреть'});
				case 'Не смотрел':
					return getGenderText(gender, {male: 'не смотрел', female: 'не смотрела'});
				default:
					return getGenderText(gender, {male: 'обновил статус', female: 'обновила статус'});
			}
		default:
			return getGenderText(gender, {male: 'обновил статус', female: 'обновила статус'});
	}
}

function translateActionType(action, actionResult, logType, gender) {
	switch (action) {
		case 'score':
			switch (actionResult) {
				case '0':
					if (logType !== 'episode') {
						return getGenderText(gender, {male: 'оценил', female: 'оценила'});
					}
					return getGenderText(gender, {male: 'посмотрел', female: 'посмотрела'});
				case '-1':
					return getGenderText(gender, {male: 'не смотрел', female: 'не смотрела'});
				default:
					return getGenderText(gender, {male: 'оценил', female: 'оценила'});
			}
		case "status":
			return getStatusActionText(actionResult, logType, gender);
		case "review":
			return getGenderText(gender, {male: 'оставил отзыв', female: 'оставила отзыв'});
		case "spent_time":
			return getGenderText(gender, {male: 'указал время прохождения', female: 'указала время прохождения'});
		case "episodes": {
			const count = Number(actionResult);
			if (count > 0) {
				return `${getGenderText(gender, {male: 'посмотрел', female: 'посмотрела'})} ${count} ${intToSeries(count)}`;
			}
			return `${getGenderText(gender, {male: 'не посмотрел', female: 'не посмотрела'})} ${Math.abs(count)} ${intToSeries(Math.abs(count))}`;
		}
		case "is_following":
			if (actionResult === "True") {
				return getGenderText(gender, {male: 'подписался на', female: 'подписалась на'});
			}
			return getGenderText(gender, {male: 'отписался от', female: 'отписалась от'});
		case "is_tracking":
			if (actionResult === "True") {
				return getGenderText(gender, {male: 'начал отслеживать', female: 'начала отслеживать'});
			}
			return getGenderText(gender, {male: 'перестал отслеживать', female: 'перестала отслеживать'});
		default:
			return action;
	}
}

function translateType(type, actionType, actionResult) {
	switch (type) {
		case "game":
			if (actionType === "score") return "игру";
			if (actionType === "review") return "об игре";
			if (actionType === "spent_time") return "игры";
			if (actionType === "status") {
				if (actionResult === 'Буду играть' || actionResult === 'Играю' || actionResult === 'Не играл') {
					return "игру";
				}
				return "игру";
			}
			return "игры";
		case "movie":
			if (actionType === "score") return "фильм";
			if (actionType === "review") return "о фильме";
			if (actionType === "status") return "фильм";
			return "фильма";
		case "show":
			if (actionType === "score") return "сериал";
			if (actionType === "review") return "о сериале";
			if (actionType === "status") return "сериал";
			return "сериала";
		case "season":
			return "";
		case "episode":
			return "";
		case "user":
			return "пользователя";
		case "person":
			return "";
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
					{' '}
					<span className={bem.element('muted')}>сериала</span>
					{' '}
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
						{intToEpisodeInLogContext(id.episode_number)} {id.season_number} {intToSeasonsInEpisodeContext(id.season_number)}
					</Link>
					{' '}
					<span className={bem.element('muted')}>сериала</span>
					{' '}
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
		case "person":
			return (
				<Link
					toRoute={ROUTE_PERSON}
					toRouteParams={{
						personId: id,
					}}
					className={bem.element('link')}>
					{name}
				</Link>
			);
		default:
			return name;
	}
}

function actionResultToStr(actionType, actionResult, target, bem) {
	const actionResultNumber = Number(actionResult);
	switch (actionType) {
		case "score":
			if ((target !== "episode") || (actionResultNumber > 0)) {
				return <span className={bem.element('score')}>☆ {actionResultNumber}</span>;
			}
			return "";
		case "status":
			return "";
		case "review":
			return `"${actionResult}"`;
		case "spent_time":
			return formatHours(actionResultNumber);
		case "episodes":
			return "";
		case "is_following":
		case "is_tracking":
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
