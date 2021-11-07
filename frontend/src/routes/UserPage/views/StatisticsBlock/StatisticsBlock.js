import React from "react";
import GenresChart from "./GenresChart/GenresChart";
import YearsChart from "./YearsChart/YearsChart";
import ChartBlock from "./ChartBlock/ChartBlock";

function StatisticsBlock({ stats }) {
	return (
		<div>
			<ChartBlock stats={stats} />
			<div hidden={!stats?.games}>
				<h3>Игры</h3>
				<p style={{ marginBottom: "1rem" }}>
					Игр сыграно: {stats?.games?.count}, часов наиграно: {stats?.games?.total_spent_time}
				</p>
				<p>Популярные жанры:</p>
				<GenresChart chartData={stats?.games?.genres} hidden={stats?.games?.genres?.length < 1} />
				<p>Пройденные игры по году выпуска:</p>
				<YearsChart chartData={stats?.games?.years} hidden={stats?.games?.years?.length < 1} />
			</div>
			<div hidden={!stats?.movies}>
				<h3>Фильмы</h3>
				<p style={{ marginBottom: "1rem" }}>
					Фильмов посмотрено: {stats?.movies?.count}, часов просмотра: {stats?.movies?.total_spent_time}
				</p>
				<p>Популярные жанры:</p>
				<GenresChart chartData={stats?.movies?.genres} hidden={stats?.movies?.genres?.length < 1} />
				<p>Просмотренные фильмы по году выпуска:</p>
				<YearsChart chartData={stats?.movies?.years} hidden={stats?.movies?.years?.length < 1} />
			</div>
			<div hidden={!stats?.episodes}>
				<h3>Сериалы</h3>
				<p style={{ marginBottom: "1rem" }}>
					Серий сериалов посмотрено: {stats?.episodes?.count}, часов просмотра: {stats?.episodes?.total_spent_time}
				</p>
				<GenresChart chartData={stats?.episodes?.genres} hidden={stats?.episodes?.genres?.length < 1} />
				<p>Просмотренные сериалы по году выпуска:</p>
				<YearsChart chartData={stats?.episodes?.years} hidden={stats?.episodes?.years?.length < 1} />
			</div>
		</div>
	);
}

export default StatisticsBlock;
