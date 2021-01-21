import React, { useEffect, useState } from "react";
import { Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { COLORS } from "./Colors";

import { MDBDataTable } from "mdbreact";

function ShowBlock({ shows, stats }) {
	const [showChartData, setShowChartData] = useState([]);

	const showColumns = [
		{
			label: "Название",
			field: "name",
			sort: "disabled",
		},
		{
			label: "Статус",
			field: "status",
			sort: "asc",
		},
		{
			label: "Оценка",
			field: "score",
			sort: "asc",
		},
		{
			label: "Отзыв",
			field: "review",
			sort: "asc",
		},
		{
			label: "Часов просмотра",
			field: "spentTime",
			sort: "asc",
		},
	];

	const [showTableData, setShowTableData] = useState({
		columns: showColumns,
		rows: [],
	});

	useEffect(
		() => {
			if (shows) {
				setShowTableData({
					columns: showColumns,
					rows: shows.map((show) => {
						return {
							name: (
								<a className='dataTable' href={window.location.origin + "/show/" + show.show.tmdb_id}>
									{show.show.tmdb_name}
								</a>
							),
							name2: show.show.tmdb_name,
							status: show.status,
							score: show.score,
							review: show.review,
							spentTime: show.spent_time,
							/*clickEvent: (e) => {
                                //window.open('/game/' + game.game.rawg_slug);
                                history.push('/movie/' + movie.movie.tmdb_id)
                            }*/
						};
					}),
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[shows]
	);

	useEffect(
		() => {
			setShowChartData([]);
			if (stats) {
				if (stats?.genres) {
					let newData = [];
					let counter = 0;
					for (let genre in stats.genres)
						if (stats.genres[genre].spent_time_percent > 2 && counter < 11) {
							newData.push({ name: stats.genres[genre].name, Процент: stats.genres[genre].spent_time_percent });
							counter++;
						}
					newData = newData.sort((a, b) => (a["Процент"] > b["Процент"] ? -1 : 1));
					setShowChartData(newData);
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stats]
	);

	return (
		<div>
			<p>
				Серий сериалов посмотрено: {stats?.count}, часов просмотра: {stats?.total_spent_time}
			</p>
			<MDBDataTable
				striped
				bordered
				small
				data={showTableData}
				info={false}
				barReverse={true}
				noBottomColumns={true}
				noRecordsFoundLabel='Ничего не найдено!'
				paginationLabel={["Предыдущая", "Следующая"]}
				entriesLabel='Показывать сериалов на странице'
				searchLabel='Поиск'
				responsive={true}
			/>
			<div hidden={showChartData.length < 1}>
				{document.body.clientHeight < document.body.clientWidth ? (
					<BarChart width={Math.min(showChartData.length * 100, document.body.clientWidth)} height={300} data={showChartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
						<XAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} angle={-10} tickMargin={15} />
						<YAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} />
						<Tooltip
							itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
							contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
							cursor={false}
						/>
						<Bar dataKey='Процент'>
							{showChartData.map((entry, index) => (
								<Cell fill={COLORS[index]} key={index} />
							))}
						</Bar>
					</BarChart>
				) : (
					<BarChart width={document.body.clientWidth - 25} height={showChartData.length * 40} data={showChartData} margin={{ top: 5, right: 0, left: 45, bottom: 20 }} layout='vertical'>
						<YAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} tickMargin={0} type='category' />
						<XAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} type='number' />
						<Tooltip
							itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
							contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
							cursor={false}
						/>
						<Bar dataKey='Процент'>
							{showChartData.map((entry, index) => (
								<Cell fill={COLORS[index]} key={index} />
							))}
						</Bar>
					</BarChart>
				)}
			</div>
		</div>
	);
}

export default ShowBlock;
