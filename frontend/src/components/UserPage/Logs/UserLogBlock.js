import React, { useEffect, useState } from "react";
import Pagination from "rc-pagination";
import SelectMulti from "../../Common/SelectMulti";
import InputNumber from "../../Common/InputNumber";
import LogRow from "./LogRow";
import { MDBIcon } from "mdbreact";
import useWindowDimensions from "../../../hooks/useWindowDimensions";

function UserLogBlock({ userID, logs, showUsername, requestUserLogs, currentUser, onDeleteLog, logsType }) {
	const [logsByDay, setLogsByDay] = useState([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState([]);
	const [collapse, setCollapse] = useState(true);
	const { width } = useWindowDimensions();

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	useEffect(
		() => {
			if (logsType === "user" || (logsType === "userFriends" && currentUser)) requestUserLogs(userID, currentPage, pageSize, query, filters);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[userID, currentPage, currentUser, logsType, pageSize, filters]
	);

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
		<div className='logs'>
			<div className='logsHeader'>
				<div className='logsHeaderLeft'>
					<div className='firstRow'>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								requestUserLogs(userID, currentPage, pageSize, query, filters);
							}}>
							<input
								type='text'
								placeholder='Поиск'
								aria-label='Поиск'
								className='searchUserLogsInput'
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
								}}
							/>
						</form>
						<button className='mobileOpenButton' onClick={toggleCollapse}>
							{collapse ? <MDBIcon icon='angle-down' /> : <MDBIcon icon='angle-up' />}
						</button>
					</div>

					<SelectMulti
						placeholder={"Тип логов"}
						onChange={(e) => {
							setFilters(e.map((obj) => obj.value));
						}}
						options={[
							{ value: "game", label: "Игры" },
							{ value: "movie", label: "Фильмы" },
							{ value: "show", label: "Сериал" },
							{ value: "user", label: "Пользователи" },
						]}
						hidden={collapse && width < 748}
					/>
				</div>
				<div className='pageSizeBlock' hidden={collapse && width < 748}>
					Записей на странице
					<InputNumber value={pageSize} max={100} min={1} onChange={(value) => setPageSize(value)} dataList={[5, 10, 25, 50, 100]} />
				</div>
			</div>
			{logsByDay.map((dayLog, counter) => (
				<div key={counter} className='logDay'>
					<h5 className='logDate'>{dayLog.date.toLocaleDateString("ru-RU")}</h5>
					<div className='logRows'>
						{dayLog.logs.map((log) => (
							<LogRow log={log} showUsername={showUsername} key={log.id + log.created} currentUser={currentUser} onDeleteLog={onDeleteLog} />
						))}
					</div>
				</div>
			))}
			<Pagination
				total={logs.count}
				pageSize={pageSize}
				onChange={(e) => {
					setCurrentPage(e);
				}}
				current={currentPage}
			/>
		</div>
	);
}

export default UserLogBlock;
