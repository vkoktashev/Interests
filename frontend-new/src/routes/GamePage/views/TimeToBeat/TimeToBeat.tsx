import React from "react";
import classnames from 'classnames';
import { MdAccessTime } from "react-icons/md";
import "./time-to-beat.scss";

type TTimeSource = 'hltb' | 'igdb';
type TTimeKey = 'main' | 'extra' | 'complete';

interface IHltbInfo {
	gameplay_main: number;
	gameplay_main_unit: string;
	gameplay_main_extra: number;
	gameplay_main_extra_unit: string;
	gameplay_completionist: number;
	gameplay_completionist_unit: string;
	source?: TTimeSource;
}

export type ITimeToBeatProps = {
	hltbInfo?: IHltbInfo;
	className?: string;
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

function toTenth(value: number): string {
	return (Math.round(value * 10) / 10).toFixed(1);
}

export function TimeToBeat(props: ITimeToBeatProps) {
	if (!props.hltbInfo) {
		return null;
	}

	const hltbInfo = props.hltbInfo;
	const sourceLabel = hltbInfo?.source === 'igdb' ? 'IGDB' : 'HLTB';
	const items: Array<{
		key: TTimeKey;
		value: number | null;
		unit?: string;
		iconClassName: string;
		title: string;
	}> = [
		{
			key: 'main',
			value: toPositiveNumber(hltbInfo?.gameplay_main),
			unit: hltbInfo?.gameplay_main_unit,
			iconClassName: 'time-to-beat__icon time-to-beat__icon_green',
			title: 'Главный сюжет',
		},
		{
			key: 'extra',
			value: toPositiveNumber(hltbInfo?.gameplay_main_extra),
			unit: hltbInfo?.gameplay_main_extra_unit,
			iconClassName: 'time-to-beat__icon time-to-beat__icon_yellow',
			title: 'Главный сюжет + побочные задания',
		},
		{
			key: 'complete',
			value: toPositiveNumber(hltbInfo?.gameplay_completionist),
			unit: hltbInfo?.gameplay_completionist_unit,
			iconClassName: 'time-to-beat__icon time-to-beat__icon_red',
			title: 'Полное прохождение',
		},
	];

	const metricElements = items
		.filter(item => item.value !== null)
		.map(item => (
			<div key={item.key} className='time-to-beat__element'>
				<MdAccessTime className={item.iconClassName} title={item.title} />
				{toTenth(item.value as number)} {item.unit}
			</div>
		));

	if (!metricElements.length) {
		return null;
	}

	return (
		<div className={classnames('time-to-beat', props.className)}>
			<p className='time-to-beat__label'>
				Время прохождения {hltbInfo?.source ? `(${sourceLabel})` : ''}
			</p>
			{metricElements}
		</div>
	);
}
