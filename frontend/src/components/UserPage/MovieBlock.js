import React, { useEffect, useState } from "react";
import { Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { COLORS } from "./Colors";

import { MDBDataTable } from "mdbreact";

function MovieBlock({ movies, stats }) {
	const [movieChartData, setMovieChartData] = useState([]);
	const movieColumns = [
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
	];

	const [movieTableData, setMovieTableData] = useState({
		columns: movieColumns,
		rows: [],
	});

	useEffect(
		() => {
			if (movies) {
				setMovieTableData({
					columns: movieColumns,
					rows: movies.map((movie) => {
						return {
							name: (
								<a className='dataTable' href={window.location.origin + "/movie/" + movie.movie.tmdb_id}>
									{movie.movie.tmdb_name}
								</a>
							),
							name2: movie.movie.tmdb_name,
							status: movie.status,
							score: movie.score,
							review: movie.review,
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
		[movies]
	);

	useEffect(
		() => {
			setMovieChartData([]);
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
					setMovieChartData(newData);
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stats]
	);

	return (
		<div>
			<p>
				Фильмов посмотрено: {stats?.count}, часов просмотра: {stats?.total_spent_time}
			</p>
			<MDBDataTable
				striped
				bordered
				small
				data={movieTableData}
				info={false}
				barReverse={true}
				noBottomColumns={true}
				noRecordsFoundLabel='Ничего не найдено!'
				paginationLabel={["Предыдущая", "Следующая"]}
				entriesLabel='Показывать фильмов на странице'
				searchLabel='Поиск'
				responsive={true}
			/>

			<div hidden={movieChartData.length < 1}>
				{document.body.clientHeight < document.body.clientWidth ? (
					<BarChart width={Math.min(movieChartData.length * 100, document.body.clientWidth)} height={300} data={movieChartData} margin={{ top: 5, right: 10, left: 10, bottom: 15 }}>
						<XAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} angle={-10} tickMargin={15} />
						<YAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} />
						<Tooltip
							itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
							contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
							cursor={false}
						/>
						<Bar dataKey='Процент'>
							{movieChartData.map((entry, index) => (
								<Cell fill={COLORS[index]} key={index} />
							))}
						</Bar>
					</BarChart>
				) : (
					<BarChart width={document.body.clientWidth - 25} height={movieChartData.length * 40} data={movieChartData} margin={{ top: 5, right: 0, left: 45, bottom: 20 }} layout='vertical'>
						<YAxis dataKey='name' tickLine={false} tick={{ fill: "rgb(238, 238, 238)" }} interval={0} tickMargin={0} type='category' />
						<XAxis domain={[0, "dataMax"]} tick={{ fill: "rgb(238, 238, 238)" }} type='number' />
						<Tooltip
							itemStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)" }}
							contentStyle={{ color: "rgb(238, 238, 238)", backgroundColor: "rgb(30, 30, 30)", borderRadius: "10px" }}
							cursor={false}
						/>
						<Bar dataKey='Процент'>
							{movieChartData.map((entry, index) => (
								<Cell fill={COLORS[index]} key={index} />
							))}
						</Bar>
					</BarChart>
				)}
			</div>
		</div>
	);
}

export default MovieBlock;
