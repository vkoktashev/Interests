import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import DayInfo from "./DayInfo";
import "./style.css";

function CalendarBlock({ calendar }) {
	const [value, onChange] = useState(new Date());
	const [currentDay, setCurrentDay] = useState({});

	useEffect(() => {
		if (calendar) {
			if (formatDate(value) in calendar) setCurrentDay(calendar[formatDate(value)]);
			else setCurrentDay({});
		}
	}, [value, calendar]);

	function dateToTile({ activeStartDate, date, view }) {
		if (view === "month" && formatDate(date) in calendar) {
			let day = calendar[formatDate(date)];
			return (
				<div className='calendarDay'>
					<div className='calendarDayTile Games' hidden={!(day?.games?.length > 0)}>
						{day?.games?.length}
					</div>
					<div className='calendarDayTile Movies' hidden={!(day?.movies?.length > 0)}>
						{day?.movies?.length}
					</div>
					<div className='calendarDayTile Episodes' hidden={!(day?.episodes?.length > 0)}>
						{day?.episodes?.length}
					</div>
				</div>
			);
		}
		return null;
	}

	return (
		<div className='calendarBlock'>
			<Calendar className='calendar' onChange={onChange} value={value} defaultView='month' minDetail='decade' locale='ru-RU' minDate={new Date()} tileContent={dateToTile} />
			<DayInfo day={currentDay} date={value} />
		</div>
	);
}

export default CalendarBlock;

function pad(number) {
	if (number < 10) {
		return "0" + number;
	}
	return number;
}
function formatDate(date) {
	return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}
