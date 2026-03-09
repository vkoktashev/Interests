import React, {useMemo} from "react";
import {useBem} from '@steroidsjs/core/hooks';
import {IPersonalityScoreStat} from "../types";
import PersonLink from '../../../../../shared/PersonLink';

interface ITopPersonalitiesProps {
	chartData: IPersonalityScoreStat[];
	emptyLabel: string;
	withPersonLinks?: boolean;
}

function TopPersonalities({ chartData, emptyLabel, withPersonLinks }: ITopPersonalitiesProps) {
	const bem = useBem('stats-block');

	const data = useMemo(() => {
		return (chartData || [])
			.filter(item => !!item?.name)
			.sort((a, b) => b.points - a.points)
			.slice(0, 10);
	}, [chartData]);

	if (data.length < 1) {
		return (
			<div className={bem.element('empty')}>
				{emptyLabel}
			</div>
		);
	}

	return (
		<div className={bem.element('personalities')}>
			{data.map((item, index) => (
				<div className={bem.element('person-row')} key={`${item.name}-${index}`}>
					<div className={bem.element('person-main')}>
						{withPersonLinks && item.id ? (
							<PersonLink id={item.id} name={item.name} className={bem.element('person-name')} />
						) : (
							<span className={bem.element('person-name')}>{item.name}</span>
						)}
					</div>
					<div className={bem.element('person-count')}>{item.points} баллов</div>
				</div>
			))}
		</div>
	);
}

export default TopPersonalities;
