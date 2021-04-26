import React from "react";
import { Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { COLORS } from "./Colors";

function ChartBlock({ chartData, hidden }) {
	return (
		<div hidden={hidden}>
			{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? (
				<BarChart width={document.body.clientWidth - 50} height={chartData.length * 40} data={chartData} margin={{ top: 5, right: 0, left: 45, bottom: 20 }} layout='vertical'>
					<YAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} tickMargin={0} type='category' />
					<XAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} type='number' />
					<Tooltip
						itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
						contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
						cursor={false}
					/>
					<Bar dataKey='Процент'>
						{chartData.map((entry, index) => (
							<Cell fill={COLORS[index]} key={index} />
						))}
					</Bar>
				</BarChart>
			) : (
				<BarChart width={Math.min(chartData.length * 100, document.body.clientWidth - 50)} height={300} data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
					<XAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} angle={-10} tickMargin={15} />
					<YAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} />
					<Tooltip
						itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
						contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
						cursor={false}
					/>
					<Bar dataKey='Процент'>
						{chartData.map((entry, index) => (
							<Cell fill={COLORS[index]} key={index} />
						))}
					</Bar>
				</BarChart>
			)}
		</div>
	);
}

export default ChartBlock;
