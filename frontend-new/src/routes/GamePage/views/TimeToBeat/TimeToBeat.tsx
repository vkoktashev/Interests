import React from "react";
import classnames from 'classnames';
import { MdAccessTime } from "react-icons/md";
import formatHours from '../../../../shared/formatHours';
import "./time-to-beat.scss";

type TTimeSource = 'hltb' | 'igdb';
type TTimeKey = 'main' | 'extra' | 'complete';

interface IHltbInfo {
	gameplay_main: number;
	gameplay_main_extra: number;
	gameplay_completionist: number;
	source?: TTimeSource;
	refreshing?: boolean;
}

export type ITimeToBeatProps = {
	hltbInfo?: IHltbInfo;
	className?: string;
	isLoading?: boolean;
};

function toPositiveNumber(value?: number): number | null {
	if (value === undefined || value === null) {
		return null;
	}
	const numeric = Number(value);
	if (Number.isNaN(numeric) || numeric <= 0) {
		return null;
	}
	return numeric;
}

export function TimeToBeat(props: ITimeToBeatProps) {
	if (!props.hltbInfo && !props.isLoading) {
		return null;
	}

	const hltbInfo = props.hltbInfo;
	const sourceLabel = hltbInfo?.source === 'igdb' ? 'IGDB' : 'HLTB';
	const items: Array<{
		key: TTimeKey;
		value: number | null;
		iconClassName: string;
		title: string;
	}> = [
		{
			key: 'main',
			value: toPositiveNumber(hltbInfo?.gameplay_main),
			iconClassName: 'time-to-beat__icon time-to-beat__icon_green',
			title: 'Главный сюжет',
		},
		{
			key: 'extra',
			value: toPositiveNumber(hltbInfo?.gameplay_main_extra),
			iconClassName: 'time-to-beat__icon time-to-beat__icon_yellow',
			title: 'Главный сюжет + побочные задания',
		},
		{
			key: 'complete',
			value: toPositiveNumber(hltbInfo?.gameplay_completionist),
			iconClassName: 'time-to-beat__icon time-to-beat__icon_red',
			title: 'Полное прохождение',
		},
	];

	const metricElements = items
		.filter(item => item.value !== null)
		.map(item => (
			<div key={item.key} className='time-to-beat__element'>
				<MdAccessTime className={item.iconClassName} title={item.title} />
				{formatHours(item.value, {fractionDigits: 1})}
			</div>
		));

	if (!props.isLoading && !metricElements.length) {
		return null;
	}

	return (
		<div className={classnames('time-to-beat', props.className)}>
			<p className='time-to-beat__label'>
				Время прохождения {hltbInfo?.source ? `(${sourceLabel})` : ''}
			</p>
			{props.isLoading ? (
				<div className='time-to-beat__loading'>
					загружаем...
				</div>
			) : (
				metricElements
			)}
		</div>
	);
}
