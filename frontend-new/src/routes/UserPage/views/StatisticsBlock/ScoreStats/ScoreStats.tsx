import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import {ResponsiveLine} from "@nivo/line";
import {CHART_COLORS, nivoTheme} from "../chartConfig";
import {IScoresStats} from "../types";

interface IScoreStatsProps {
	data?: IScoresStats;
}

function ScoreStats({ data }: IScoreStatsProps) {
	const bem = useBem('stats-block');

	if (!data) {
		return (
			<div className={bem.element('empty')}>
				Нет данных по оценкам
			</div>
		);
	}

	const chartData = [
		{
			id: 'Игры',
			data: (data.games?.distribution || []).map(item => ({x: String(item.score), y: item.count})),
		},
		{
			id: 'Фильмы',
			data: (data.movies?.distribution || []).map(item => ({x: String(item.score), y: item.count})),
		},
		{
			id: 'Сериалы',
			data: (data.shows?.distribution || []).map(item => ({x: String(item.score), y: item.count})),
		},
	];

	return (
		<div className={bem.element('scores')}>
			<div className={bem.element('scores-overall')}>
				Средняя оценка (общая): <strong>{data.overall_average}</strong>
			</div>
			<div className={bem.element('scores-metrics')}>
				<div className={bem.element('scores-metric')}>Игры: <strong>{data.games?.average || 0}</strong></div>
				<div className={bem.element('scores-metric')}>Фильмы: <strong>{data.movies?.average || 0}</strong></div>
				<div className={bem.element('scores-metric')}>Сериалы: <strong>{data.shows?.average || 0}</strong></div>
			</div>
			<div className={bem.element('score-distribution-chart')}>
				<ResponsiveLine
					data={chartData}
					theme={nivoTheme}
					margin={{top: 12, right: 18, bottom: 40, left: 42}}
					colors={[CHART_COLORS[0], CHART_COLORS[4], CHART_COLORS[2]]}
					curve='monotoneX'
					lineWidth={2}
					pointSize={6}
					pointBorderWidth={1}
					pointBorderColor='#191a1b'
					enableGridX={false}
					enableGridY
					useMesh
					axisTop={null}
					axisRight={null}
					axisBottom={{
						tickSize: 0,
						tickPadding: 8,
						legend: 'Оценка',
						legendOffset: 30,
						legendPosition: 'middle',
					}}
					axisLeft={{
						tickSize: 0,
						tickPadding: 8,
						legend: 'Количество',
						legendOffset: -34,
						legendPosition: 'middle',
					}}
					legends={[
						{
							anchor: 'bottom',
							direction: 'row',
							justify: false,
							translateY: 40,
							itemWidth: 80,
							itemHeight: 16,
							itemsSpacing: 8,
							symbolSize: 10,
							itemTextColor: '#f1f1fb',
						},
					]}
					tooltip={({point}) => (
						<div className={bem.element('tooltip')}>
							<div>{point.seriesId}</div>
							<div>Оценка {point.data.xFormatted}: <strong>{point.data.yFormatted}</strong></div>
						</div>
					)}
				/>
			</div>
		</div>
	);
}

export default ScoreStats;
