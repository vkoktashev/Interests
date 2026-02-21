import React, {useMemo} from "react";
import {useBem} from "@steroidsjs/core/hooks";
import {ResponsiveBar} from "@nivo/bar";
import {nivoTheme} from "../chartConfig";
import {IBacklogStats} from "../types";

interface IBacklogStatsProps {
	data?: IBacklogStats;
}

function BacklogStats({ data }: IBacklogStatsProps) {
	const bem = useBem('stats-block');

	const countData = useMemo(() => ([
		{name: 'Игры', value: Number(data?.counts?.games || 0)},
		{name: 'Фильмы', value: Number(data?.counts?.movies || 0)},
		{name: 'Сериалы', value: Number(data?.counts?.shows || 0)},
	]), [data?.counts?.games, data?.counts?.movies, data?.counts?.shows]);

	const hasBacklog = (data?.counts?.total || 0) > 0;

	if (!hasBacklog) {
		return (
			<div className={bem.element('empty')}>
				Бэклог пуст
			</div>
		);
	}

	return (
		<div className={bem.element('backlog')}>
			<div className={bem.element('backlog-metrics')}>
				<div className={bem.element('backlog-metric')}>
					<span className={bem.element('backlog-metric-label')}>Всего в бэклоге</span>
					<span className={bem.element('backlog-metric-value')}>{data?.counts?.total || 0}</span>
				</div>
				<div className={bem.element('backlog-metric')}>
					<span className={bem.element('backlog-metric-label')}>Средний возраст бэклога</span>
					<span className={bem.element('backlog-metric-value')}>
						{Number(data?.average_age_days?.overall || 0).toFixed(1)} дн.
					</span>
				</div>
				<div className={bem.element('backlog-metric')}>
					<span className={bem.element('backlog-metric-label')}>Оценка часов (фильмы + сериалы)</span>
					<span className={bem.element('backlog-metric-value')}>
						{Number(data?.estimated_hours_to_close?.total || 0).toFixed(1)} ч.
					</span>
				</div>
			</div>

			<div className={bem.element('backlog-grid')}>
				<div className={bem.element('backlog-card')}>
					<h5 className={bem.element('backlog-card-title')}>По категориям (планы)</h5>
					<div className={bem.element('backlog-counts-chart')}>
						<ResponsiveBar
							data={countData}
							keys={['value']}
							indexBy='name'
							layout='horizontal'
							theme={nivoTheme}
							margin={{top: 6, right: 8, bottom: 24, left: 80}}
							padding={0.3}
							colors={['#4f5dea']}
							borderRadius={6}
							axisTop={null}
							axisRight={null}
							axisBottom={{tickSize: 0, tickPadding: 8}}
							axisLeft={{tickSize: 0, tickPadding: 8}}
							enableGridY={false}
							enableLabel={false}
							tooltip={({indexValue, value}) => (
								<div className={bem.element('tooltip')}>
									<div>{String(indexValue)}</div>
									<strong>{String(value)}</strong>
								</div>
							)}
						/>
					</div>
				</div>

				<div className={bem.element('backlog-card')}>
					<h5 className={bem.element('backlog-card-title')}>Средний возраст (дней)</h5>
					<div className={bem.element('backlog-age-list')}>
						<div className={bem.element('backlog-age-item')}>
							<span>Игры</span>
							<strong>{Number(data?.average_age_days?.games || 0).toFixed(1)}</strong>
						</div>
						<div className={bem.element('backlog-age-item')}>
							<span>Фильмы</span>
							<strong>{Number(data?.average_age_days?.movies || 0).toFixed(1)}</strong>
						</div>
						<div className={bem.element('backlog-age-item')}>
							<span>Сериалы</span>
							<strong>{Number(data?.average_age_days?.shows || 0).toFixed(1)}</strong>
						</div>
					</div>
				</div>

				<div className={bem.element('backlog-card')}>
					<h5 className={bem.element('backlog-card-title')}>Оценка часов до закрытия</h5>
					<div className={bem.element('backlog-age-list')}>
						<div className={bem.element('backlog-age-item')}>
							<span>Фильмы</span>
							<strong>{Number(data?.estimated_hours_to_close?.movies || 0).toFixed(1)} ч.</strong>
						</div>
						<div className={bem.element('backlog-age-item')}>
							<span>Сериалы</span>
							<strong>{Number(data?.estimated_hours_to_close?.shows || 0).toFixed(1)} ч.</strong>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default BacklogStats;
