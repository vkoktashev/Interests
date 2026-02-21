import React, {useMemo} from "react";
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import {Loader} from '@steroidsjs/core/ui/layout';
import GenresChart from "./GenresChart/GenresChart";
import YearsChart from "./YearsChart/YearsChart";
import ChartBlock from "./ChartBlock/ChartBlock";
import TopPersonalities from "./TopPersonalities/TopPersonalities";
import StatusFunnel from "./StatusFunnel/StatusFunnel";
import ScoreStats from "./ScoreStats/ScoreStats";
import ActivityStats from "./ActivityStats/ActivityStats";
import "./statistics-block.scss";
import {IUserStats} from "./types";

interface IStatisticsBlockProps {
	userId: number;
}

function StatisticsBlock({ userId }: IStatisticsBlockProps) {
	const bem = useBem('stats-block');
	const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const statsFetchConfig = useMemo(() => userId && ({
		url: `/users/user/${userId}/stats/?tz=${encodeURIComponent(userTimezone)}`,
		method: 'get',
	}), [userId, userTimezone]);
	const {data: stats, isLoading} = useFetch(statsFetchConfig as any);

	if (isLoading && !stats) {
		return <Loader />;
	}

	const safeStats = (stats || {}) as IUserStats;

	const categories = [
		{key: 'games', title: 'Игры', stats: safeStats?.games, countLabel: 'Сыграно'},
		{key: 'movies', title: 'Фильмы', stats: safeStats?.movies, countLabel: 'Просмотрено'},
		{key: 'episodes', title: 'Сериалы', stats: safeStats?.episodes, countLabel: 'Серий просмотрено'},
	];

	return (
		<div className={bem.block()}>
			<div className={bem.element('overview')}>
				<h3 className={bem.element('title')}>Распределение времени</h3>
				<ChartBlock stats={safeStats} />
			</div>

			<div className={bem.element('sections')}>
				<section className={bem.element('section')}>
					<div className={bem.element('section-head')}>
						<h3 className={bem.element('section-title')}>
							Дополнительная статистика
						</h3>
					</div>
					<div className={bem.element('extra-sections')}>
						<div className={bem.element('panel-card')}>
							<h4 className={bem.element('chart-title')}>Активность по времени</h4>
							<ActivityStats data={safeStats?.activity}/>
						</div>
						<div className={bem.element('panel-card')}>
							<h4 className={bem.element('chart-title')}>Оценки и распределение (1-10)</h4>
							<ScoreStats data={safeStats?.scores}/>
						</div>
						<div className={bem.element('panel-card')}>
							<h4 className={bem.element('chart-title')}>Воронка статусов</h4>
							<StatusFunnel data={safeStats?.status_funnel}/>
						</div>
						<div className={bem.element('top-personalities')}>
							<div className={bem.element('panel-card')}>
								<h4 className={bem.element('chart-title')}>Toп актеры</h4>
								<TopPersonalities
									chartData={safeStats?.top_actors || []}
									emptyLabel="Нет данных по актерам"
								/>
							</div>
							<div className={bem.element('panel-card')}>
								<h4 className={bem.element('chart-title')}>Toп режиссеры</h4>
								<TopPersonalities
									chartData={safeStats?.top_directors || []}
									emptyLabel="Нет данных по режиссерам"
								/>
							</div>
						</div>
					</div>
				</section>
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
