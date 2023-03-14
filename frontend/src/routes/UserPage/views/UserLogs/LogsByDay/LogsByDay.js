import React, { useEffect, useState } from "react";
import LogRow from "../LogRow/LogRow";
import "./logs-by-day.sass";

function UserLogs({ logs, showUsername, currentUser, onDeleteLog }) {
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

		for (let i in logs) {
			let date = new Date(logs[i].created);

			if (newLogs.length === 0) {
				newLogs.push({
					date: date,
					logs: [logs[i]],
				});
			} else {
				if (
					date.getDay() === newLogs[newLogs.length - 1].date.getDay()
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
		<div className='logs-by-day'>
			{logsByDay.map((dayLog, counter) => (
				<div key={counter} className='logs-by-day__day'>
					<div className='logs-by-day__date'>
						{
							dayLog.date.toLocaleDateString("ru-RU", {
								year: dayLog.date.getFullYear() === new Date().getFullYear()
									? undefined
									: "numeric",
								month: "numeric",
								day: "numeric"
							})}
					</div>
					<div className='logs-by-day__logs'>
						{dayLog.logs.map((log) => (
							<LogRow
								log={log}
								showUsername={showUsername}
								key={log.id + log.created}
								currentUser={currentUser}
								onDeleteLog={onDeleteLog}
								className='logs-by-day__log'
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

export default UserLogs;
