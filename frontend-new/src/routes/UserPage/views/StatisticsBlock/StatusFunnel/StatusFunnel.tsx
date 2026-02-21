import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import {IStatusFunnel} from "../types";

interface IStatusFunnelProps {
	data?: IStatusFunnel;
}

function StatusFunnel({ data }: IStatusFunnelProps) {
	const bem = useBem('stats-block');

	const categories = [
		{key: 'games', title: 'Игры', value: data?.games},
		{key: 'movies', title: 'Фильмы', value: data?.movies},
		{key: 'shows', title: 'Сериалы', value: data?.shows},
	];

	const hasAnyData = categories.some(category => {
		const value = category.value;
		return !!value && (value.planned + value.in_progress + value.completed + value.dropped > 0);
	});

	if (!hasAnyData) {
		return (
			<div className={bem.element('empty')}>
				Нет данных по статусам
			</div>
		);
	}

	return (
		<div className={bem.element('funnel-grid')}>
			{categories.map(category => {
				const value = category.value || {planned: 0, in_progress: 0, completed: 0, dropped: 0};

				return (
					<div key={category.key} className={bem.element('funnel-card')}>
						<div className={bem.element('funnel-title')}>{category.title}</div>
						<div className={bem.element('funnel-row')}>
							<span className={bem.element('funnel-label')}>В планах</span>
							<span className={bem.element('funnel-value')}>{value.planned}</span>
						</div>
						<div className={bem.element('funnel-row')}>
							<span className={bem.element('funnel-label')}>В процессе</span>
							<span className={bem.element('funnel-value')}>{value.in_progress}</span>
						</div>
						<div className={bem.element('funnel-row')}>
							<span className={bem.element('funnel-label')}>Завершено</span>
							<span className={bem.element('funnel-value')}>{value.completed}</span>
						</div>
						<div className={bem.element('funnel-row')}>
							<span className={bem.element('funnel-label')}>Дропнуто</span>
							<span className={bem.element('funnel-value')}>{value.dropped}</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default StatusFunnel;
