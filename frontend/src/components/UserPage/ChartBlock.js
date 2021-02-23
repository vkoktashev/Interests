import React, { useEffect, useState } from "react";
import { PieChart, Pie, Legend, Cell, Tooltip } from "recharts";
import { COLORS } from "./Colors";

function ChartBlock({ stats }) {
	const [chartData, setChartData] = useState([]);

	useEffect(() => {
		setChartData([]);
		if (stats.games) {
			let newData = [];
			if (stats.games.total_spent_time > 0) newData.push({ name: "Часов в играх", value: stats.games.total_spent_time });
			if (stats.movies.total_spent_time > 0) newData.push({ name: "Часов в фильмах", value: stats.movies.total_spent_time });
			if (stats.episodes.total_spent_time > 0) newData.push({ name: "Часов в сериалах", value: stats.episodes.total_spent_time });
			setChartData(newData);
		}
	}, [stats]);

	return (
		<div hidden={chartData.length < 1}>
			<PieChart width={350} height={250} hidden={chartData.length < 1}>
				<Pie dataKey='value' data={chartData} cx='50%' cy='50%' outerRadius={80} fill='#8884d8' labelLine={true} label minAngle={5}>
					{chartData.map((entry, index) => (
						<Cell fill={COLORS[index]} key={index} />
					))}
				</Pie>
				<Tooltip
					itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
					contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
					cursor={false}
				/>
				<Legend verticalAlign='bottom' horizontalAlign='center' />
			</PieChart>
		</div>
	);
}

export default ChartBlock;
