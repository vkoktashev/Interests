import React, { useEffect, useState } from "react";
import { Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { COLORS } from "./Colors";

import { MDBDataTable } from "mdbreact";

function GameBlock({ games, stats }) {
	const [gameChartData, setGameChartData] = useState([]);
	const gameColumns = [
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
			label: "Время прохождения",
			field: "spent_time",
			sort: "asc",
		},
	];

	const [gameTableData, setGameTableData] = useState({
		columns: gameColumns,
		rows: [],
	});

	useEffect(
		() => {
			if (games) {
				setGameTableData({
					columns: gameColumns,
					rows: games.map((game) => {
						return {
							name: (
								<a className='dataTable' href={window.location.origin + "/game/" + game.game.rawg_slug}>
									{game.game.rawg_name}
								</a>
							),
							name2: game.game.rawg_name,
							status: game.status,
							score: game.score,
							review: game.review,
							spent_time: parseFloat(game.spent_time),
							/*clickEvent: (e) => {
                                    //window.open('/game/' + game.game.rawg_slug);
                                    history.push('/game/' + game.game.rawg_slug);
                                }*/
						};
					}),
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[games]
	);

	useEffect(
		() => {
			setGameChartData([]);
			if (stats) {
				if (stats?.genres) {
					let newData = [];
					for (let genre in stats.genres) if (stats.genres[genre].spent_time_percent > 2) newData.push({ name: stats.genres[genre].name, Процент: stats.genres[genre].spent_time_percent });
					newData = newData.sort((a, b) => (a["Процент"] > b["Процент"] ? -1 : 1));
					setGameChartData(newData);
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stats]
	);

	return (
		<div>
			<p>
				Игр сыграно: {stats?.count}, часов наиграно: {stats?.total_spent_time}
			</p>
			<MDBDataTable
				striped
				bordered
				small
				data={gameTableData}
				info={false}
				barReverse={true}
				noBottomColumns={true}
				noRecordsFoundLabel='Ничего не найдено!'
				paginationLabel={["Предыдущая", "Следующая"]}
				entriesLabel='Показывать игр на странице'
				searchLabel='Поиск'
				className='dataTable'
			/>
			<div hidden={gameChartData.length < 1}>
				<BarChart width={1000} height={300} data={gameChartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
					<XAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} angle={-10} tickMargin={15} />
					<YAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} />
					<Tooltip
						itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
						contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
						cursor={false}
					/>
					<Bar dataKey='Процент'>
						{gameChartData.map((entry, index) => (
							<Cell fill={COLORS[index]} key={index} />
						))}
					</Bar>
				</BarChart>
			</div>
		</div>
	);
}

export default GameBlock;
