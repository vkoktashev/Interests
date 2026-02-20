import React, {useMemo} from "react";
import {ResponsiveBar} from '@nivo/bar';
import {CHART_COLORS, nivoTheme} from "../chartConfig";
import {IGenreStat} from "../types";

interface IGenresChartProps {
	chartData: IGenreStat[];
	hidden?: boolean;
}

function GenresChart({ chartData, hidden }: IGenresChartProps) {
	const preparedData = useMemo(() => {
		return (chartData || [])
			.filter(entry => !!entry?.name)
			.map(entry => ({
				name: entry.name as string,
				percent: Number(entry.spent_time_percent || 0),
			}))
			.sort((a, b) => b.percent - a.percent)
			.slice(0, 10);
	}, [chartData]);

	if (hidden || preparedData.length < 1) {
		return (
			<div className='stats-block__empty'>
				Нет данных по жанрам
			</div>
		);
	}

	return (
		<div className='stats-block__genres-chart' style={{height: Math.max(260, preparedData.length * 34)}}>
			<ResponsiveBar
				data={preparedData}
				keys={['percent']}
				indexBy='name'
				layout='horizontal'
				theme={nivoTheme}
				margin={{top: 8, right: 18, bottom: 24, left: 120}}
				padding={0.26}
				valueScale={{type: 'linear'}}
				indexScale={{type: 'band', round: true}}
				colors={({index}) => CHART_COLORS[index % CHART_COLORS.length]}
				borderRadius={6}
				enableGridX
				enableGridY={false}
				axisTop={null}
				axisRight={null}
				axisBottom={{
					tickSize: 0,
					tickPadding: 8,
					legend: 'Доля времени, %',
					legendPosition: 'middle',
					legendOffset: 34,
				}}
				axisLeft={{
					tickSize: 0,
					tickPadding: 10,
				}}
				enableLabel={false}
				tooltip={({value, indexValue}) => (
					<div className='stats-block__tooltip'>
						<div>{indexValue}</div>
						<strong>{value}%</strong>
					</div>
				)}
			/>
		</div>
	);
}

export default GenresChart;
