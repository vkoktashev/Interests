import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import classnames from "classnames";
import { toast } from "react-toastify";
import Calendar from "react-calendar";
import LoadingOverlay from "react-loading-overlay";

import CurrentUserStore from '../../store/CurrentUserStore';
import AuthStore from '../../store/AuthStore';
import DayInfo from "./views/DayInfo";
import ReleasesList from "./views/ReleasesList";

import "react-calendar/dist/Calendar.css";
import styles from "./calendar-page.module.sass";
import "./react-calendar.sass";

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
				<div className={styles.calendarDay}>
					<div className={styles.calendarDayBody}>
						<div className={classnames(styles.calendarDayGames, !day?.games?.length > 0 ? styles.calendarDayHidden : "")}>{day?.games?.length}</div>
						<div className={classnames(styles.calendarDayMovies, !day?.movies?.length > 0 ? styles.calendarDayHidden : "")}>{day?.movies?.length}</div>
						<div className={classnames(styles.calendarDayEpisodes, !day?.episodes?.length > 0 ? styles.calendarDayHidden : "")}>{day?.episodes?.length}</div>
					</div>
				</div>
			);
		}
		return null;
	}

	return (
		<div className={styles.calendarPage}>
			<div>
				<h1 className={styles.pageHeader}>Календарь релизов</h1>
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
