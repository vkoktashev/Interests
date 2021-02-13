import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import * as selectors from "../../store/reducers";
import * as actions from "../../store/actions";

import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import DayInfo from "./DayInfo";
import ReleasesList from "./ReleasesList";
import "./style.css";

function CalendarPage({ loggedIn, calendar, getUserCalendar }) {
	const [value, onChange] = useState(new Date());
	const [currentDay, setCurrentDay] = useState({});

	useEffect(() => {
		if (loggedIn) {
			getUserCalendar();
		}
	}, [loggedIn, getUserCalendar]);

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
					{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? <DayInfo day={currentDay} date={value} /> : ""}
					<Calendar className='calendar' onChange={onChange} value={value} defaultView='month' minDetail='decade' locale='ru-RU' minDate={new Date()} tileContent={dateToTile} />
					{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? "" : <DayInfo day={currentDay} date={value} />}
					<ReleasesList calendar={Object.entries(calendar)} />
				</div>
			</div>
		</div>
	);
}

const mapStateToProps = (state) => ({
	loggedIn: selectors.getLoggedIn(state),
	calendar: selectors.getUserPageCalendar(state),
});

const mapDispatchToProps = (dispatch) => {
	return {
		getUserCalendar: () => {
			dispatch(actions.requestUserPageCalendar());
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(CalendarPage);

function pad(number) {
	if (number < 10) {
		return "0" + number;
	}
	return number;
}
function formatDate(date) {
	return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}
