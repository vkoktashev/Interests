import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import {IScoresStats, IScoreDistributionItem} from "../types";

interface IScoreStatsProps {
	data?: IScoresStats;
}

interface IScoreCategoryViewProps {
	title: string;
	average: number;
	distribution: IScoreDistributionItem[];
}

function ScoreCategoryView({title, average, distribution}: IScoreCategoryViewProps) {
	const bem = useBem('stats-block');
	const maxCount = Math.max(...distribution.map(item => item.count), 0);

	return (
		<div className={bem.element('scores-category')}>
			<div className={bem.element('scores-category-head')}>
				<span className={bem.element('scores-category-title')}>{title}</span>
				<span className={bem.element('scores-category-average')}>{average}</span>
			</div>
			<div className={bem.element('scores-bars')}>
				{distribution.map(item => {
					const width = maxCount > 0 ? Math.max(6, Math.round((item.count / maxCount) * 100)) : 0;
					return (
						<div className={bem.element('scores-bar-row')} key={`${title}-${item.score}`}>
							<span className={bem.element('scores-score')}>{item.score}</span>
							<div className={bem.element('scores-track')}>
								<div
									className={bem.element('scores-fill')}
									style={{width: `${width}%`, opacity: item.count > 0 ? 1 : 0}}
								/>
							</div>
							<span className={bem.element('scores-count')}>{item.count}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function ScoreStats({ data }: IScoreStatsProps) {
	const bem = useBem('stats-block');

	if (!data) {
		return (
			<div className={bem.element('empty')}>
				Нет данных по оценкам
			</div>
		);
	}

	return (
		<div className={bem.element('scores')}>
			<div className={bem.element('scores-overall')}>
				Средняя оценка (общая): <strong>{data.overall_average}</strong>
			</div>
			<div className={bem.element('scores-grid')}>
				<ScoreCategoryView
					title='Игры'
					average={data.games?.average || 0}
					distribution={data.games?.distribution || []}
				/>
				<ScoreCategoryView
					title='Фильмы'
					average={data.movies?.average || 0}
					distribution={data.movies?.distribution || []}
				/>
				<ScoreCategoryView
					title='Сериалы'
					average={data.shows?.average || 0}
					distribution={data.shows?.distribution || []}
				/>
			</div>
		</div>
	);
}

export default ScoreStats;
