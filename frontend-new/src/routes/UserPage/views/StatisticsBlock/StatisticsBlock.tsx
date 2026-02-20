import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import GenresChart from "./GenresChart/GenresChart";
import YearsChart from "./YearsChart/YearsChart";
import ChartBlock from "./ChartBlock/ChartBlock";
import "./statistics-block.scss";
import {IUserStats} from "./types";

interface IStatisticsBlockProps {
	stats?: IUserStats;
}

function StatisticsBlock({ stats }: IStatisticsBlockProps) {
	const bem = useBem('stats-block');
	const categories = [
		{key: 'games', title: 'Игры', stats: stats?.games, countLabel: 'Сыграно'},
		{key: 'movies', title: 'Фильмы', stats: stats?.movies, countLabel: 'Просмотрено'},
		{key: 'episodes', title: 'Сериалы', stats: stats?.episodes, countLabel: 'Серий просмотрено'},
	];

	return (
		<div className={bem.block()}>
			<div className={bem.element('overview')}>
				<h3 className={bem.element('title')}>Распределение времени</h3>
				<ChartBlock stats={stats} />
			</div>

			<div className={bem.element('sections')}>
				{categories
					.filter(category => !!category.stats)
					.map(category => (
						<section className={bem.element('section')} key={category.key}>
							<div className={bem.element('section-head')}>
								<h3 className={bem.element('section-title')}>
									{category.title}
								</h3>
								<div className={bem.element('metrics')}>
									<div className={bem.element('metric')}>
										<span className={bem.element('metric-label')}>
											{category.countLabel}
										</span>
										<span className={bem.element('metric-value')}>
											{category.stats?.count || 0}
										</span>
									</div>
									<div className={bem.element('metric')}>
										<span className={bem.element('metric-label')}>
											Часов
										</span>
										<span className={bem.element('metric-value')}>
											{category.stats?.total_spent_time || 0}
										</span>
									</div>
								</div>
							</div>

							<div className={bem.element('charts')}>
								<div className={bem.element('chart-card')}>
									<h4 className={bem.element('chart-title')}>Популярные жанры</h4>
									<GenresChart chartData={category.stats?.genres || []} />
								</div>
								<div className={bem.element('chart-card')}>
									<h4 className={bem.element('chart-title')}>Динамика по годам</h4>
									<YearsChart chartData={category.stats?.years || []} />
								</div>
							</div>
						</section>
					))}
			</div>
		</div>
	);
}

export default StatisticsBlock;
