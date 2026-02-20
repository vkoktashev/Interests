import React, {useMemo} from "react";
import {ResponsiveLine} from '@nivo/line';
import {nivoTheme} from "../chartConfig";
import {IYearStat} from "../types";

interface IYearsChartProps {
	chartData: IYearStat[];
	hidden?: boolean;
}

function YearsChart({ chartData, hidden }: IYearsChartProps) {
	const data = useMemo(() => {
		const points = (chartData || [])
			.filter(entry => entry?.year !== null && entry?.year !== undefined)
			.map(entry => ({
				x: String(entry.year),
				y: Number(entry.count || 0),
			}))
			.sort((a, b) => Number(a.x) - Number(b.x));

		return [
			{
				id: 'items',
				data: points,
			},
		];
	}, [chartData]);

	const xTickValues = useMemo(() => {
		const points = data[0].data;
		if (points.length <= 8) {
			return points.map(point => point.x);
		}

		const step = Math.ceil(points.length / 8);
		const ticks = points
			.filter((_, index) => index % step === 0)
			.map(point => point.x);

		const lastTick = points[points.length - 1]?.x;
		if (lastTick && ticks[ticks.length - 1] !== lastTick) {
			ticks.push(lastTick);
		}

		return ticks;
	}, [data]);

	if (hidden || data[0].data.length < 1) {
		return (
			<div className='stats-block__empty'>
				Нет данных по годам
			</div>
		);
	}

	return (
		<div className='stats-block__years-chart'>
			<ResponsiveLine
				data={data}
				theme={nivoTheme}
				margin={{top: 14, right: 18, bottom: 38, left: 44}}
				colors={['#4f5dea']}
				enableArea
				areaOpacity={0.18}
				curve='monotoneX'
				lineWidth={3}
				pointSize={8}
				pointColor='#4f5dea'
				pointBorderWidth={2}
				pointBorderColor='#191a1b'
				enableGridX={false}
				enableGridY
				useMesh
				axisTop={null}
				axisRight={null}
				axisBottom={{
					tickValues: xTickValues,
					tickSize: 0,
					tickPadding: 8,
					legend: 'Год',
					legendOffset: 32,
					legendPosition: 'middle',
				}}
				axisLeft={{
					tickSize: 0,
					tickPadding: 8,
					legend: 'Количество',
					legendOffset: -34,
					legendPosition: 'middle',
				}}
				tooltip={({point}) => (
					<div className='stats-block__tooltip'>
						<div>{point.data.xFormatted}</div>
						<strong>{point.data.yFormatted}</strong>
					</div>
				)}
			/>
		</div>
	);
}

export default YearsChart;
