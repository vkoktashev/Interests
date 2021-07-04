import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import classnames from "classnames";
import CurrentUserStore from "../../../store/CurrentUserStore";
import AuthStore from "../../../store/AuthStore";

import { toast } from "react-toastify";
import Calendar from "react-calendar";
import LoadingOverlay from "react-loading-overlay";
import "react-calendar/dist/Calendar.css";
import DayInfo from "../DayInfo/DayInfo";
import ReleasesList from "../ReleasesList/ReleasesList";

import "./calendar-page.sass";

const CalendarPage = observer(() => {
	const { loggedIn } = AuthStore;
	const { calendar, calendarState, requestCalendar } = CurrentUserStore;

	const [value, onChange] = useState(new Date());
	const [currentDay, setCurrentDay] = useState({});

	useEffect(() => {
		if (loggedIn) {
			requestCalendar();
		}
	}, [loggedIn, requestCalendar]);

	useEffect(() => {
		if (calendarState.startsWith("error:")) toast.error(`Ошибка загрузки! ${calendarState}`);
	}, [calendarState]);

	useEffect(() => {
		if (calendar) {
			if (formatDate(value) in calendar) setCurrentDay(calendar[formatDate(value)]);
			else setCurrentDay({});
		}
	}, [value, calendar]);

	function dateToTile({ date, view }) {
		if (view === "month" && formatDate(date) in calendar) {
			let day = calendar[formatDate(date)];
			return (
				<div className='calendar-day'>
					<div className='calendar-day__body'>
						<div className={classnames("calendar-day__games", !day?.games?.length > 0 ? "calendar-day__hidden" : "")}>{day?.games?.length}</div>
						<div className={classnames("calendar-day__movies", !day?.movies?.length > 0 ? "calendar-day__hidden" : "")}>{day?.movies?.length}</div>
						<div className={classnames("calendar-day__episodes", !day?.episodes?.length > 0 ? "calendar-day__hidden" : "")}>{day?.episodes?.length}</div>
					</div>
				</div>
			);
		}
		return null;
	}

	return (
		<div className='calendar-page'>
			<div className='calendar-page__body'>
				<h1 className='calendar-page__header'>Календарь релизов</h1>
				<LoadingOverlay active={calendarState === "pending"} spinner text='Загрузка...'>
					{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? <DayInfo day={currentDay} date={value} /> : ""}
					<Calendar onChange={onChange} value={value} defaultView='month' minDetail='decade' locale='ru-RU' minDate={new Date()} tileContent={dateToTile} />
					{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "" : <DayInfo day={currentDay} date={value} />}
					<ReleasesList calendar={Object.entries(calendar)} />
				</LoadingOverlay>
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
