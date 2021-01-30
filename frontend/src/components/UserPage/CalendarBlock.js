import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

function CalendarBlock(props) {
	const [value, onChange] = useState(new Date());

	useEffect(() => {
		console.log(value);
	}, [value]);

	return (
		<div className='calendarBlock'>
			<Calendar
				className='calendar'
				onChange={onChange}
				value={value}
				defaultView='month'
				minDetail='decade'
				locale='ru-RU'
				minDate={new Date()}
				tileContent={({ activeStartDate, date, view }) =>
					view === "month" ? (
						<div className='calendarDay'>
							<p>Check</p>
						</div>
					) : null
				}
			/>
			<div className='dayInfo'></div>
		</div>
	);
}

export default CalendarBlock;
