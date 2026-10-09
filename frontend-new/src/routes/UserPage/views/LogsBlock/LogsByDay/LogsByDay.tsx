import React, { useEffect, useState } from "react";
import {useBem, useDispatch} from '@steroidsjs/core/hooks';
import {goToRoute} from '@steroidsjs/core/actions/router';
import LogRow from "../LogRow/LogRow";
import {ROUTE_USER} from '../../../../index';
import {getDefaultAvatarUrl} from '../../../../../shared/avatar';
import "./logs-by-day.scss";

function isSameDay(firstDate, secondDate) {
	return firstDate.getDate() === secondDate.getDate()
		&& firstDate.getMonth() === secondDate.getMonth()
		&& firstDate.getFullYear() === secondDate.getFullYear();
}

function formatDay(date) {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);

	const formattedDate = date.toLocaleDateString('ru-RU', {
		year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
		month: 'long',
		day: 'numeric',
	});

	if (isSameDay(date, today)) {
		return `Сегодня, ${formattedDate}`;
	}
	if (isSameDay(date, yesterday)) {
		return `Вчера, ${formattedDate}`;
	}

	return formattedDate;
}

function getDayKey(date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupLogsByAuthor(logs) {
	const groups = new Map();

	logs.forEach(log => {
		const authorKey = log.user_id ?? log.user;

		if (!groups.has(authorKey)) {
			groups.set(authorKey, {
				userId: log.user_id,
				username: log.user,
				gender: log.user_gender,
				logs: [],
			});
		}

		groups.get(authorKey).logs.push(log);
	});

	return Array.from(groups.values());
}

function formatEventsCount(count) {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return `${count} событий`;
	}
	if (lastDigit === 1) {
		return `${count} событие`;
	}
	if (lastDigit >= 2 && lastDigit <= 4) {
		return `${count} события`;
	}

	return `${count} событий`;
}

function UserLogs({ logs, showUsername, onDeleteLog }) {
	const bem = useBem('logs-by-day');
	const dispatch = useDispatch();
	const [logsByDay, setLogsByDay] = useState([]);

	useEffect(
		() => {
			setLogsByDay(groupLogsByDay(logs.log));
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[logs]
	);

	function groupLogsByDay(logs) {
		let newLogs = [];

		for (const i in logs) {
			let date = new Date(logs[i].created);

			if (newLogs.length === 0) {
				newLogs.push({
					date: date,
					logs: [logs[i]],
				});
			} else {
				if (
					date.getDate() === newLogs[newLogs.length - 1].date.getDate()
					&& date.getMonth() === newLogs[newLogs.length - 1].date.getMonth()
					&& date.getFullYear() === newLogs[newLogs.length - 1].date.getFullYear()
				) {
					newLogs[newLogs.length - 1].logs.push(logs[i]);
				} else {
					newLogs.push({
						date: date,
						logs: [logs[i]],
					});
				}
			}

		}
		return newLogs;
	}

	return (
		<div className={bem.block({grouped: showUsername})}>
			{logsByDay.map(dayLog => (
				<div key={getDayKey(dayLog.date)} className={bem.element('day')}>
					<div className={bem.element('date')}>
						{formatDay(dayLog.date)}
					</div>
					{showUsername ? (
						<div className={bem.element('author-groups')}>
							{groupLogsByAuthor(dayLog.logs).map(authorGroup => (
								<div key={authorGroup.userId ?? authorGroup.username} className={bem.element('author-group')}>
									<a
										href={`/user/${authorGroup.userId}`}
										className={bem.element('author')}
										onClick={(event) => {
											event.preventDefault();
											dispatch(goToRoute(ROUTE_USER, {userId: authorGroup.userId}));
										}}
									>
										<img
											className={bem.element('author-avatar')}
											src={getDefaultAvatarUrl(
												authorGroup.username || authorGroup.userId || 'user',
												authorGroup.gender,
											)}
											alt={authorGroup.username}
											loading='lazy'
										/>
										<span className={bem.element('author-info')}>
											<span className={bem.element('author-name')}>{authorGroup.username}</span>
											<span className={bem.element('author-count')}>
												{formatEventsCount(authorGroup.logs.length)}
											</span>
										</span>
									</a>
									<div className={bem.element('author-logs')}>
										{authorGroup.logs.map(log => (
											<LogRow
												log={log}
												grouped
												key={`${log.type}:${log.id}:${log.created}`}
												onDeleteLog={onDeleteLog}
												className={bem.element('author-log')}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					) : (
						<div className={bem.element('logs')}>
							{dayLog.logs.map(log => (
								<LogRow
									log={log}
									key={`${log.type}:${log.id}:${log.created}`}
									onDeleteLog={onDeleteLog}
									className={bem.element('log')}
								/>
							))}
						</div>
					)}
				</div>
			))}
		</div>
	);
}

export default UserLogs;
