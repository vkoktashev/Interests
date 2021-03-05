import React, { useEffect, useState } from "react";
import { MDBIcon } from "mdbreact";
import LogRow from "./LogRow";

function UserLogBlock({ logs, showUsername, onChangePage }) {
	const [logsByDay, setLogsByDay] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);

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

			if (newLogs.length === 0)
				newLogs.push({
					date: date,
					logs: [logs[i]],
				});
			else if (date.getDay() === newLogs[newLogs.length - 1].date.getDay()) newLogs[newLogs.length - 1].logs.push(logs[i]);
			else
				newLogs.push({
					date: date,
					logs: [logs[i]],
				});
		}
		return newLogs;
	}

	return (
		<div>
			{logsByDay.map((dayLog) => (
				<div key={dayLog.logs[0].id} className='logDay'>
					<h5 className='logDate'>{dayLog.date.toLocaleDateString("ru-RU")}</h5>
					<div className='logRows'>
						{dayLog.logs.map((log) => (
							<LogRow log={log} showUsername={showUsername} key={log.id + log.created} />
						))}
					</div>
				</div>
			))}
			<button
				className='logPaginationButton'
				disabled={!logs.has_next_page}
				onClick={() => {
					if (logs.has_next_page) {
						onChangePage(currentPage + 1);
						setCurrentPage(currentPage + 1);
					}
				}}>
				<MDBIcon icon='arrow-down' />
			</button>

			<button
				className='logPaginationButton'
				disabled={currentPage === 1}
				onClick={() => {
					if (currentPage > 1) {
						onChangePage(currentPage - 1);
						setCurrentPage(currentPage - 1);
					}
				}}>
				<MDBIcon icon='arrow-up' />
			</button>
		</div>
	);
}

export default UserLogBlock;
