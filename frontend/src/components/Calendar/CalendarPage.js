import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import CurrentUserStore from "../../store/CurrentUserStore";
import AuthStore from "../../store/AuthStore";

import Calendar from "react-calendar";
import LoadingOverlay from "react-loading-overlay";
import "react-calendar/dist/Calendar.css";
import DayInfo from "./DayInfo";
import ReleasesList from "./ReleasesList";
import "./style.css";

const CalendarPage = observer((props) => {
	const { loggedIn } = AuthStore;
	const { calendar, calendarIsLoading, requestCalendar } = CurrentUserStore;

	const [value, onChange] = useState(new Date());
	const [currentDay, setCurrentDay] = useState({});

	useEffect(() => {
		if (loggedIn) {
			requestCalendar();
		}
	}, [loggedIn, requestCalendar]);

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
		<div>
			<div className='bg searchBG' />
			<div className='calendarPage'>
				<div className='calendarBlock'>
					<h1 className='calendarHeader'>Календарь релизов</h1>
					<LoadingOverlay active={calendarIsLoading} spinner text='Загрузка...'>
						{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? <DayInfo day={currentDay} date={value} /> : ""}
						<Calendar className='calendar' onChange={onChange} value={value} defaultView='month' minDetail='decade' locale='ru-RU' minDate={new Date()} tileContent={dateToTile} />
						{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "" : <DayInfo day={currentDay} date={value} />}
						<ReleasesList calendar={Object.entries(calendar)} />
					</LoadingOverlay>
				</div>
			</div>
		</div>
	);
});

export default CalendarPage;

function pad(number) {
	if (number < 10) {
		return "0" + number;
	}
	return number;
}
function formatDate(date) {
	return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}
