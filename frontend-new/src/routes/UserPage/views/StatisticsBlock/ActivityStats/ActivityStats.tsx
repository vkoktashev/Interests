import React, {useMemo} from "react";
import {ResponsiveTimeRange} from '@nivo/calendar';
import type {TimeRangeTooltipProps} from '@nivo/calendar';
import {useBem} from '@steroidsjs/core/hooks';
import {nivoTheme} from "../chartConfig";
import {IActivityStats} from "../types";

interface IActivityStatsProps {
	data?: IActivityStats;
}

const ACTIVITY_COLORS = [
	'rgba(79, 93, 234, 0.32)',
	'rgba(79, 93, 234, 0.58)',
	'rgba(101, 31, 255, 0.76)',
	'#651fff',
];

function parseDate(date: string) {
	return new Date(`${date}T00:00:00`);
}

function addDays(date: Date, days: number) {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

function formatMonth(_year: number, _month: number, date: Date) {
	const month = new Intl.DateTimeFormat('ru-RU', {month: 'short'}).format(date);
	return month.charAt(0).toUpperCase() + month.slice(1);
}

function formatTooltipDate(date: Date) {
	return new Intl.DateTimeFormat('ru-RU', {
		day: 'numeric',
		month: 'long',
	}).format(date);
}

function getColorScaleMax(values: number[]) {
	if (!values.length) {
		return 4;
	}

	const sortedValues = [...values].sort((left, right) => left - right);
	const upperQuartileIndex = Math.floor((sortedValues.length - 1) * 0.75);
	return Math.max(4, sortedValues[upperQuartileIndex]);
}

function formatEvents(count: number) {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;

	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
		return `${count} событий`;
	}
	if (lastDigit === 1) {
		return `${count} событие`;
	}
	if (lastDigit >= 2 && lastDigit <= 4) {
		return `${count} события`;
	}
	return `${count} событий`;
}

function ActivityStats({ data }: IActivityStatsProps) {
	const bem = useBem('stats-block');
	const calendarData = useMemo(() => data?.days
		.filter(day => day.count > 0)
		.map(day => ({
			day: day.date,
			value: day.count,
		})) || [], [data?.days]);

	if (!data || !data.days?.length) {
		return (
			<div className={bem.element('empty')}>
				Нет данных по активности
			</div>
		);
	}

	const periodStart = parseDate(data.period.start);
	const periodEndExclusive = addDays(parseDate(data.period.end), 1);
	const maxValue = getColorScaleMax(calendarData.map(day => day.value));
	const renderTooltip = ({day, value}: TimeRangeTooltipProps) => (
		<div className={bem.element('tooltip', {activity: true})}>
			<div>{formatTooltipDate(parseDate(day))}</div>
			<strong>{formatEvents(Number(value) || 0)}</strong>
		</div>
	);

	return (
		<div className={bem.element('activity')}>
			<div className={bem.element('activity-metrics')}>
				<div className={bem.element('activity-metric')}>
					<span className={bem.element('activity-metric-label')}>Текущий streak</span>
					<span className={bem.element('activity-metric-value')}>{data.streak.current} дн.</span>
				</div>
				<div className={bem.element('activity-metric')}>
					<span className={bem.element('activity-metric-label')}>Лучший streak</span>
					<span className={bem.element('activity-metric-value')}>{data.streak.longest} дн.</span>
				</div>
				<div className={bem.element('activity-metric')}>
					<span className={bem.element('activity-metric-label')}>Активных дней</span>
					<span className={bem.element('activity-metric-value')}>{data.active_days}</span>
				</div>
				<div className={bem.element('activity-metric')}>
					<span className={bem.element('activity-metric-label')}>Событий за год</span>
					<span className={bem.element('activity-metric-value')}>{data.total_events}</span>
				</div>
			</div>

			<div className={bem.element('activity-calendar')}>
				<div className={bem.element('activity-calendar-scroll')}>
					<div className={bem.element('activity-calendar-chart')}>
						<ResponsiveTimeRange
							data={calendarData}
							from={periodStart}
							to={periodEndExclusive}
							theme={nivoTheme}
							direction='horizontal'
							firstWeekday='monday'
							weekdays={['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']}
							weekdayTicks={[0, 2, 4]}
							weekdayLegendOffset={26}
							monthLegend={formatMonth}
							monthLegendOffset={12}
							margin={{top: 22, right: 0, bottom: 0, left: 0}}
							colors={ACTIVITY_COLORS}
							emptyColor='rgba(166, 166, 171, 0.08)'
							minValue={1}
							maxValue={maxValue}
							daySpacing={2}
							dayBorderWidth={1}
							dayBorderColor='rgba(255, 255, 255, 0.04)'
							dayRadius={2}
							square
							tooltip={renderTooltip}
							role='img'
						/>
					</div>
				</div>

				<div className={bem.element('activity-legend')}>
					<span>Меньше</span>
					<span className={bem.element('activity-legend-swatch', {empty: true})}/>
					{ACTIVITY_COLORS.map(color => (
						<span
							className={bem.element('activity-legend-swatch')}
							key={color}
							style={{backgroundColor: color}}
							aria-hidden='true'
						/>
					))}
					<span>Больше</span>
				</div>
			</div>
		</div>
	);
}

export default ActivityStats;
