import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import {IStatusFunnel} from "../types";
import {ResponsivePie} from "@nivo/pie";
import {CHART_COLORS, nivoTheme} from "../chartConfig";

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

	const hasAnyData = categories.some(category =>
		(category.value?.planned || 0) +
		(category.value?.in_progress || 0) +
		(category.value?.completed || 0) +
		(category.value?.dropped || 0) > 0
	);

	if (!hasAnyData) {
		return (
			<div className={bem.element('empty')}>
				Нет данных по статусам
			</div>
		);
	}

	return (
		<div className={bem.element('status-funnel-grid')}>
			{categories.map(category => {
				const value = category.value || {planned: 0, in_progress: 0, completed: 0, dropped: 0};
				const pieData = [
					{id: 'В планах', label: 'В планах', value: value.planned},
					{id: 'В процессе', label: 'В процессе', value: value.in_progress},
					{id: 'Завершено', label: 'Завершено', value: value.completed},
					{id: 'Дропнуто', label: 'Дропнуто', value: value.dropped},
				].filter(item => item.value > 0);

				return (
					<div className={bem.element('funnel-pie-card')} key={category.key}>
						<h5 className={bem.element('funnel-pie-title')}>{category.title}</h5>
						{pieData.length > 0 ? (
							<div className={bem.element('funnel-pie')}>
								<ResponsivePie
									data={pieData}
									theme={nivoTheme}
									margin={{top: 6, right: 8, bottom: 36, left: 8}}
									innerRadius={0.62}
									padAngle={1.8}
									cornerRadius={5}
									activeOuterRadiusOffset={6}
									colors={({id}) => {
										const colorMap = {
											'В планах': CHART_COLORS[0],
											'В процессе': CHART_COLORS[2],
											'Завершено': CHART_COLORS[5],
											'Дропнуто': CHART_COLORS[4],
										} as Record<string, string>;
										return colorMap[String(id)] || CHART_COLORS[0];
									}}
									enableArcLinkLabels={false}
									arcLabelsSkipAngle={12}
									arcLabelsTextColor='#f1f1fb'
									tooltip={({datum}) => (
										<div className={bem.element('tooltip')}>
											<div>{datum.label}</div>
											<strong>{datum.value}</strong>
										</div>
									)}
									legends={[
										{
											anchor: 'bottom',
											direction: 'row',
											justify: false,
											translateY: 32,
											itemsSpacing: 6,
											itemWidth: 84,
											itemHeight: 16,
											symbolSize: 9,
											itemTextColor: '#f1f1fb',
										},
									]}
								/>
							</div>
						) : (
							<div className={bem.element('empty')}>
								Нет данных
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

export default StatusFunnel;
