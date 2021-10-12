import React, { useEffect, useState } from "react";
import GenresChart from "./GenresChart/GenresChart";
import ChartBlock from "./ChartBlock/ChartBlock";

function StatisticsBlock({ stats }) {
	const [gameChartData, setGameChartData] = useState([]);
	const [movieChartData, setMovieChartData] = useState([]);
	const [showChartData, setShowChartData] = useState([]);

	function getGenresChartData(genres) {
		if (genres) {
			let newData = [];
			let counter = 0;
			for (let genre in genres.sort((a, b) => (a.spent_time_percent > b.spent_time_percent ? -1 : 1)))
				if (genres[genre].spent_time_percent > 2 && counter < 11) {
					newData.push({ name: genres[genre].name, Процент: genres[genre].spent_time_percent });
					counter++;
				}
			return newData;
		}
		return [];
	}

	useEffect(
		() => {
			setMovieChartData(getGenresChartData(stats?.movies?.genres));
			setGameChartData(getGenresChartData(stats?.games?.genres));
			setShowChartData(getGenresChartData(stats?.episodes?.genres));
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stats]
	);

	useEffect(
		() => {},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	return (
		<div>
			<ChartBlock stats={stats} />
			<div hidden={!stats?.games}>
				<h3>Игры</h3>
				<p>
					Игр сыграно: {stats?.games?.count}, часов наиграно: {stats?.games?.total_spent_time}
				</p>
				<GenresChart chartData={gameChartData} hidden={gameChartData.length < 1} />
			</div>
			<div hidden={!stats?.movies}>
				<h3>Фильмы</h3>
				<p>
					Фильмов посмотрено: {stats?.movies?.count}, часов просмотра: {stats?.movies?.total_spent_time}
				</p>
				<GenresChart chartData={movieChartData} hidden={movieChartData.length < 1} />
			</div>
			<div hidden={!stats?.episodes}>
				<h3>Сериалы</h3>
				<p>
					Серий сериалов посмотрено: {stats?.episodes?.count}, часов просмотра: {stats?.episodes?.total_spent_time}
				</p>
				<GenresChart chartData={showChartData} hidden={showChartData.length < 1} />
			</div>
		</div>
	);
}

export default StatisticsBlock;
