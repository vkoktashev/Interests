import React, {useMemo} from "react";
import {ResponsivePie} from '@nivo/pie';
import {CHART_COLORS, nivoTheme} from "../chartConfig";
import {IUserStats} from "../types";

interface IChartBlockProps {
	stats?: IUserStats;
}

interface IDistributionItem {
	id: string;
	label: string;
	value: number;
}

function DistributionChart({title, chartData}: {title: string, chartData: IDistributionItem[]}) {
	if (chartData.length < 1) {
		return (
			<div className='stats-block__chart-card'>
				<h4 className='stats-block__chart-title'>{title}</h4>
				<div className='stats-block__empty'>
					Нет данных по потраченному времени
				</div>
			</div>
		);
	}

	return (
		<div className='stats-block__chart-card'>
			<h4 className='stats-block__chart-title'>{title}</h4>
			<div className='stats-block__overview-chart'>
				<ResponsivePie
					data={chartData}
					theme={nivoTheme}
					margin={{top: 10, right: 60, bottom: 50, left: 60}}
					innerRadius={0.58}
					padAngle={1.8}
					cornerRadius={6}
					activeOuterRadiusOffset={8}
					colors={CHART_COLORS}
					enableArcLinkLabels={false}
					arcLabelsSkipAngle={9}
					arcLabelsTextColor='#f1f1fb'
					tooltip={({datum}) => (
						<div className='stats-block__tooltip'>
							<div>{datum.label}</div>
							<strong>{datum.value} ч</strong>
						</div>
					)}
					legends={[
						{
							anchor: 'bottom',
							direction: 'row',
							justify: false,
							translateY: 32,
							itemWidth: 96,
							itemHeight: 20,
							itemsSpacing: 8,
							symbolSize: 12,
							itemTextColor: '#f1f1fb',
						},
					]}
				/>
			</div>
		</div>
	);
}

function ChartBlock({ stats }: IChartBlockProps) {
	const fullTimeChartData = useMemo(() => {
		const values = [
			{id: 'games', label: 'Игры', value: stats?.games?.total_spent_time || 0},
			{id: 'movies', label: 'Фильмы', value: stats?.movies?.total_spent_time || 0},
			{id: 'episodes', label: 'Сериалы', value: stats?.episodes?.total_spent_time || 0},
		];

		return values.filter(item => item.value > 0);
	}, [stats]);

	const lastYearChartData = useMemo(() => {
		const values = [
			{id: 'games', label: 'Игры', value: stats?.time_distribution_last_year?.games || 0},
			{id: 'movies', label: 'Фильмы', value: stats?.time_distribution_last_year?.movies || 0},
			{id: 'episodes', label: 'Сериалы', value: stats?.time_distribution_last_year?.episodes || 0},
		];

		return values.filter(item => item.value > 0);
	}, [stats]);

	return (
		<div className='stats-block__overview-grid'>
			<DistributionChart title='За все время' chartData={fullTimeChartData} />
			<DistributionChart title='За последний год' chartData={lastYearChartData} />
		</div>
	);
}

export default ChartBlock;
