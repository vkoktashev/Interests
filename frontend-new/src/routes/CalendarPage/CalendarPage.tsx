import React, {useState, useEffect, useMemo} from 'react';
import Calendar from "react-calendar";
import LoadingOverlay from "react-loading-overlay";
import {useBem, useFetch} from '@steroidsjs/core/hooks';

import DayInfo from "./views/DayInfo";
import ReleasesList from "./views/ReleasesList";

import "react-calendar/dist/Calendar.css";
import "./calendar-page.scss";
import "./react-calendar.scss";
import {Loader} from '@steroidsjs/core/ui/layout';

function CalendarPage() {
	const bem = useBem('CalendarPage');
	const [value, onChange] = useState(new Date());
	const [currentDay, setCurrentDay] = useState({});

	const calendarFetchConfig = useMemo(() => ({
		url: `/api/users/user/release_calendar/`,
		method: 'get',
	}), []);
	const {data: calendar, isLoading} = useFetch(calendarFetchConfig);

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
				<div className={bem.element('day')}>
					<div className={bem.element('dayBody')}>
						<div className={bem.element('game', {hidden: !day?.games?.length })}>
							{day?.games?.length}
						</div>
						<div className={bem.element('movie', {hidden: !day?.movies?.length })}>
							{day?.movies?.length}
						</div>
						<div className={bem.element('episode', {hidden: !day?.episodes?.length })}>
							{day?.episodes?.length}
						</div>
					</div>
				</div>
			);
		}
		return null;
	}

	const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

	if (!calendar) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<div>
				<h1 className={bem.element('header')}>Календарь релизов</h1>
				<LoadingOverlay
					active={isLoading}
					spinner
					text='Загрузка...'
				>
					{isMobile && <DayInfo day={currentDay} date={value} />}
					<Calendar
						onChange={onChange as any}
						value={value}
						defaultView='month'
						minDetail='decade'
						locale='ru-RU'
						minDate={new Date()}
						tileContent={dateToTile}
					/>
					{!isMobile && <DayInfo day={currentDay} date={value} />}
					<ReleasesList calendar={Object.entries(calendar)} />
				</LoadingOverlay>
			</div>
		</div>
	);
}

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
