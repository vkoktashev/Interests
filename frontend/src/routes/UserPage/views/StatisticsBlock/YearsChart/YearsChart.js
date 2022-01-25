import React, { useEffect, useState } from "react";
import { AreaChart, linearGradient, XAxis, Tooltip, YAxis, Area, ResponsiveContainer } from "recharts";

function YearsChart(props) {
	const [chartData, setChartData] = useState([]);
	const [maxCount, setMaxCount] = useState(0);

	useEffect(() => {
		setChartData([]);
		if (props.chartData && props.chartData?.length > 0) {
			let newMaxCount = 0;
			let newData = props.chartData
				?.map((value, index, array) => {
					if (value.count > maxCount) {
						newMaxCount = value.count;
					}
					return { name: value.year, Количество: value.count };
				})
				.sort((a, b) => a.name - b.name);
			setMaxCount(newMaxCount);
			setChartData(newData);
		}
	}, [props.chartData, setChartData]);

	return (
		<div hidden={props.hidden}>
			{/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? null : (
				<ResponsiveContainer width={"100%"} height={200}>
					<AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
						<defs>
							<linearGradient id='colorUv' x1='0' y1='0' x2='0' y2='1'>
								<stop offset='5%' stopColor='#8884d8' stopOpacity={0.8} />
								<stop offset='95%' stopColor='#8884d8' stopOpacity={0} />
							</linearGradient>
						</defs>
						<XAxis dataKey='name' tick={{ fill: "rgb(238, 238, 238)" }} allowDataOverflow={false} />
						<YAxis tickLine={false} domain={[0, maxCount + 1]} tick={{ fill: "rgb(238, 238, 238)" }} tickCount={2} />
						<Tooltip contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }} />
						<Area type='monotone' dataKey='Количество' stroke='#8884d8' fillOpacity={1} fill='url(#colorUv)' />
					</AreaChart>
				</ResponsiveContainer>
			)}
		</div>
	);
}

export default YearsChart;
