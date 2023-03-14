import React, { useEffect, useState } from "react";
import Pagination from "rc-pagination";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";

import SelectMulti from '../../../../shared/SelectMulti';
import InputNumber from '../../../../shared/InputNumber';
import LogsByDay from "./LogsByDay/LogsByDay";
import useWindowDimensions from '../../../../hooks/useWindowDimensions';

import "./user-logs.sass";

function UserLogs({ userID, logs, showUsername, requestUserLogs, currentUser, onDeleteLog, logsType }) {
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

	return (
		<div className='user-logs'>
			<div className='user-logs__header'>
				<div className='user-logs__header-left'>
					<div className='user-logs__header-first-row'>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								requestUserLogs(userID, currentPage, pageSize, query, filters);
							}}>
							<input
								type='text'
								placeholder='Поиск'
								aria-label='Поиск'
								className='user-logs__search-input'
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
								}}
							/>
						</form>
						<button
							className='user-logs__mobile-expand'
							onClick={toggleCollapse}
						>
							{collapse
								? <FaAngleDown />
								: <FaAngleUp />}
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
				<div className='user-logs__page-size' hidden={collapse && width < 748}>
					<label className='user-logs__page-size-label'>
						Записей на странице
					</label>
					<InputNumber
						value={pageSize}
						max={100}
						min={1}
						onChange={(value) => setPageSize(value)}
						dataList={[5, 10, 25, 50, 100]}
					/>
				</div>
			</div>
			<LogsByDay
				logs={logs}
				showUsername={showUsername}
				currentUser={currentUser}
				onDeleteLog={onDeleteLog}
			/>
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

export default UserLogs;
