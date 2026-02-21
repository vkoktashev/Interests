import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import {ResponsiveHeatMap} from "@nivo/heatmap";
import {nivoTheme} from "../chartConfig";
import {IActivityStats} from "../types";

interface IActivityStatsProps {
	data?: IActivityStats;
}

function ActivityStats({ data }: IActivityStatsProps) {
	const bem = useBem('stats-block');

	if (!data || !data.days?.length || data.total_events === 0) {
		return (
			<div className={bem.element('empty')}>
				Нет данных по активности
			</div>
		);
	}

	const hourKeys = Array.from({length: 24}, (_, hour) => String(hour));
	const heatmapData = data.days.map(day => ({
		id: day.label,
		data: hourKeys.map(hour => ({
			x: hour,
			y: day.hours[Number(hour)] || 0,
		})),
	}));
	const maxValue = Math.max(
		1,
		...heatmapData.flatMap(day => day.data.map(cell => Number(cell.y) || 0)),
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
					<span className={bem.element('activity-metric-label')}>Событий</span>
					<span className={bem.element('activity-metric-value')}>{data.total_events}</span>
				</div>
			</div>

			<div className={bem.element('activity-heatmap')}>
				<ResponsiveHeatMap
					data={heatmapData}
					theme={nivoTheme}
					margin={{top: 12, right: 10, bottom: 34, left: 36}}
					axisTop={null}
					axisRight={null}
					axisLeft={{
						tickSize: 0,
						tickPadding: 8,
					}}
					axisBottom={{
						tickSize: 0,
						tickPadding: 8,
						tickValues: hourKeys.filter(hour => Number(hour) % 3 === 0),
					}}
					opacity={1}
					borderWidth={1}
					borderColor='rgba(255,255,255,0.08)'
					colors={cell => {
						const value = Number(cell.value) || 0;

						if (value <= 0) {
							return 'rgba(255, 255, 255, 0.04)';
						}

						const normalized = Math.log(value + 1) / Math.log(maxValue + 1);
						const eased = Math.pow(normalized, 0.82);

						// Classic intensity scale: green -> yellow -> red (muted for dark UI).
						let hue: number;
						let saturation: number;
						let lightness: number;

						if (eased < 0.6) {
							const t = eased / 0.6;
							hue = 128 + (52 - 128) * t;
							saturation = 34 + (44 - 34) * t;
							lightness = 24 + (46 - 24) * t;
						} else {
							const t = (eased - 0.6) / 0.4;
							hue = 52 + (8 - 52) * t;
							saturation = 44 + (52 - 44) * t;
							lightness = 46 + (54 - 46) * t;
						}

						return `hsla(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%, 0.86)`;
					}}
					emptyColor='rgba(255, 255, 255, 0.03)'
					enableLabels={false}
					tooltip={({cell}) => (
						<div className={bem.element('tooltip')}>
							<div>{String(cell.serieId)}, {String(cell.data.x)}:00</div>
							<strong>{String(cell.value)}</strong>
						</div>
					)}
				/>
			</div>
		</div>
	);
}

export default ActivityStats;
