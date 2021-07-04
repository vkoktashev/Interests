import React from "react";
import { useHistory } from "react-router-dom";
import Rating from "../../../Common/Rating/Rating";
import classnames from "classnames";
import "./log-row.sass";

function LogRow({ log, showUsername, onDeleteLog, className }) {
	let history = useHistory();

	function translateActionType(action, actionResult) {
		switch (action) {
			case "score":
				switch (actionResult) {
					case "0":
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
					<a
						href={window.location.origin + "/game/" + id}
						className='log-row__link'
						onClick={(e) => {
							history.push("/game/" + id);
							e.preventDefault();
						}}>
						{name}
					</a>
				);
			case "movie":
				return (
					<a
						href={window.location.origin + "/movie/" + id}
						className='log-row__link'
						onClick={(e) => {
							history.push("/movie/" + id);
							e.preventDefault();
						}}>
						{name}
					</a>
				);
			case "show":
				return (
					<a
						href={window.location.origin + "/show/" + id}
						className='log-row__link'
						onClick={(e) => {
							history.push("/show/" + id);
							e.preventDefault();
						}}>
						{name}
					</a>
				);
			case "season":
				return (
					<div style={{ display: "inline-block" }}>
						<a
							href={window.location.origin + "/show/" + id.show_id + "/season/" + id.season_number}
							className='log-row__link'
							onClick={(e) => {
								history.push("/show/" + id.show_id + "/season/" + id.season_number);
								e.preventDefault();
							}}>
							{name.name}
						</a>
						&thinsp;сериала&thinsp;
						<a
							href={window.location.origin + "/show/" + id.show_id}
							className='log-row__link'
							onClick={(e) => {
								history.push("/show/" + id.show_id);
								e.preventDefault();
							}}>
							{name.parent_name}
						</a>
					</div>
				);
			case "episode":
				return (
					<div style={{ display: "inline-block" }}>
						<a
							href={window.location.origin + "/show/" + id.show_id + "/season/" + id.season_number + "/episode/" + id.episode_number}
							className='log-row__link'
							onClick={(e) => {
								history.push("/show/" + id.show_id + "/season/" + id.season_number + "/episode/" + id.episode_number);
								e.preventDefault();
							}}>
							[s{id.season_number}e{id.episode_number}] серию
						</a>
						&thinsp;сериала&thinsp;
						<a
							href={window.location.origin + "/show/" + id.show_id}
							className='log-row__link'
							onClick={(e) => {
								history.push("/show/" + id.show_id);
								e.preventDefault();
							}}>
							{name.parent_name}
						</a>
					</div>
				);
			case "user":
				return (
					<a
						href={window.location.origin + "/user/" + id}
						className='log-row__link'
						onClick={(e) => {
							history.push("/user/" + id);
							e.preventDefault();
						}}>
						{name}
					</a>
				);
			default:
				return name;
		}
	}

	function userToLink(username, userID) {
		return (
			<a
				href={window.location.origin + "/user/" + userID}
				className='log-row__link'
				onClick={(e) => {
					history.push("/user/" + userID);
					e.preventDefault();
				}}>
				{username}
			</a>
		);
	}

	function actionResultToStr(actionType, actionResult, target) {
		switch (actionType) {
			case "score":
				if ((target !== "episode") | (actionResult > 0)) return <Rating initialRating={actionResult} readonly={true} />;
				else return "";
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
		return newDate.toLocaleTimeString("ru-RU", options);
	}

	return (
		<div className={classnames("log-row", className)}>
			{parseDate(log.created)}&thinsp;
			{showUsername ? userToLink(log.user, log.user_id) : ""}&thinsp;
			{translateActionType(log.action_type, log.action_result)}&thinsp;
			{translateType(log.type, log.action_type)}&thinsp;
			{nameToLink(log.target, log.type, log.target_id)}
			{(log.type === "user") | (log.action_type === "episodes") | (log.action_result === "0") | (log.action_result === "-1") ? "" : ":"}&thinsp;
			{actionResultToStr(log.action_type, log.action_result, log.type)}
			<button
				className={classnames("log-row__delete-button", showUsername ? "log-row__delete-button_hidden" : "")}
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
