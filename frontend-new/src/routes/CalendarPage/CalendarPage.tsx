import React, {useCallback, useMemo, useState} from 'react';
import Calendar from 'react-calendar';
import LoadingOverlay from 'react-loading-overlay';
import {Loader} from '@steroidsjs/core/ui/layout';
import {useBem, useFetch} from '@steroidsjs/core/hooks';

import useWindowDimensions from '../../hooks/useWindowDimensions';
import DayInfo from './views/DayInfo';
import ReleasesList from './views/ReleasesList';
import {EMPTY_CALENDAR_DAY, ICalendarDay, TCalendarEntry, TCalendarMap} from './calendarTypes';

import 'react-calendar/dist/Calendar.css';
import './calendar-page.scss';
import './react-calendar.scss';

const MOBILE_BREAKPOINT = 860;

function pad(number: number): string {
	return number < 10 ? `0${number}` : String(number);
}

function toDateKey(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isCalendarDay(value: unknown): value is Partial<ICalendarDay> {
	return Boolean(value) && typeof value === 'object';
}

function normalizeCalendar(data: unknown): TCalendarMap {
	if (!data || typeof data !== 'object') {
		return {};
	}

	return Object.entries(data as Record<string, unknown>).reduce<TCalendarMap>((acc, [date, value]) => {
		if (!isCalendarDay(value)) {
			return acc;
		}

		acc[date] = {
			games: Array.isArray(value.games) ? value.games : [],
			movies: Array.isArray(value.movies) ? value.movies : [],
			episodes: Array.isArray(value.episodes) ? value.episodes : [],
		};

		return acc;
	}, {});
}

function getDayTotal(day: ICalendarDay): number {
	return day.games.length + day.movies.length + day.episodes.length;
}

function toMonthKey(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function sortCalendarEntries(entries: TCalendarEntry[]): TCalendarEntry[] {
	return [...entries].sort((first, second) => {
		const firstTime = new Date(`${first[0]}T00:00:00`).getTime();
		const secondTime = new Date(`${second[0]}T00:00:00`).getTime();
		return firstTime - secondTime;
	});
}

function CalendarPage() {
	const bem = useBem('CalendarPage');
	const {width} = useWindowDimensions();
	const isMobile = width <= MOBILE_BREAKPOINT;
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());

	const {data, isLoading} = useFetch(useMemo(() => ({
		url: '/users/user/release_calendar/',
		method: 'get',
	}), []));

	const calendarMap = useMemo(() => normalizeCalendar(data), [data]);
	const selectedDay = useMemo(() => calendarMap[toDateKey(selectedDate)] || EMPTY_CALENDAR_DAY, [calendarMap, selectedDate]);

	const entries = useMemo(
		() => sortCalendarEntries(Object.entries(calendarMap) as TCalendarEntry[]),
		[calendarMap]
	);
	const monthlyTotals = useMemo(() => {
		return entries.reduce<Record<string, {games: number; movies: number; episodes: number}>>((acc, [dateKey, day]) => {
			const monthKey = dateKey.slice(0, 7);
			if (!acc[monthKey]) {
				acc[monthKey] = {games: 0, movies: 0, episodes: 0};
			}
			acc[monthKey].games += day.games.length;
			acc[monthKey].movies += day.movies.length;
			acc[monthKey].episodes += day.episodes.length;
			return acc;
		}, {});
	}, [entries]);

	const calendarStats = useMemo(() => {
		return entries.reduce((acc, [, day]) => {
			acc.games += day.games.length;
			acc.movies += day.movies.length;
			acc.episodes += day.episodes.length;
			acc.days += getDayTotal(day) > 0 ? 1 : 0;
			return acc;
		}, {games: 0, movies: 0, episodes: 0, days: 0});
	}, [entries]);

	const tileContent = useCallback(({date, view}: {date: Date; view: string}) => {
		if (view === 'year') {
			const monthStats = monthlyTotals[toMonthKey(date)];
			if (!monthStats) {
				return null;
			}
			const monthTotal = monthStats.games + monthStats.movies + monthStats.episodes;
			if (monthTotal < 1) {
				return null;
			}
			return (
				<div className={bem.element('tile-month-counters')}>
					<span className={bem.element('tile-month-total')}>{monthTotal}</span>
					{monthStats.games > 0 && <span className={bem.element('tile-counter', {game: true})}>{monthStats.games}</span>}
					{monthStats.movies > 0 && <span className={bem.element('tile-counter', {movie: true})}>{monthStats.movies}</span>}
					{monthStats.episodes > 0 && <span className={bem.element('tile-counter', {episode: true})}>{monthStats.episodes}</span>}
				</div>
			);
		}

		if (view === 'month') {
			const day = calendarMap[toDateKey(date)];
			if (!day || getDayTotal(day) === 0) {
				return null;
			}

			return (
				<div className={bem.element('tile-counters')}>
					{day.games.length > 0 && <span className={bem.element('tile-counter', {game: true})}>{day.games.length}</span>}
					{day.movies.length > 0 && <span className={bem.element('tile-counter', {movie: true})}>{day.movies.length}</span>}
					{day.episodes.length > 0 && <span className={bem.element('tile-counter', {episode: true})}>{day.episodes.length}</span>}
				</div>
			);
		}
		return null;
	}, [bem, calendarMap, monthlyTotals]);

	if (!data && isLoading) {
		return <Loader />;
	}

	return (
		<div className={bem.block()}>
			<section className={bem.element('hero')}>
				<div>
					<h1 className={bem.element('title')}>Календарь релизов</h1>
					<p className={bem.element('subtitle')}>
						Следите за ближайшими играми, фильмами и сериями в одном месте
					</p>
				</div>
				<div className={bem.element('stats')}>
					<div className={bem.element('stat')}>
						<span className={bem.element('stat-value')}>{calendarStats.days}</span>
						<span className={bem.element('stat-label')}>дней с релизами</span>
					</div>
					<div className={bem.element('stat')}>
						<span className={bem.element('stat-value')}>{calendarStats.games + calendarStats.movies + calendarStats.episodes}</span>
						<span className={bem.element('stat-label')}>всего релизов</span>
					</div>
				</div>
			</section>

			<LoadingOverlay active={isLoading} spinner text='Обновляем календарь...'>
				<div className={bem.element('main')}>
					<section className={bem.element('calendar-card')}>
						<Calendar
							onChange={value => setSelectedDate(Array.isArray(value) ? value[0] : value)}
							value={selectedDate}
							defaultView='month'
							minDetail='decade'
							locale='ru-RU'
							minDate={new Date()}
							tileContent={tileContent}
						/>
					</section>

					<section className={bem.element('day-card')}>
						<DayInfo day={selectedDay} date={selectedDate} compact={isMobile} />
					</section>
				</div>

				<section className={bem.element('timeline-card')}>
					<h2 className={bem.element('timeline-title')}>Лента ближайших релизов</h2>
					<ReleasesList entries={entries} />
				</section>
			</LoadingOverlay>
		</div>
	);
}

export default CalendarPage;
