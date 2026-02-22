import React from "react";
import classnames from 'classnames';
import { MdAccessTime } from "react-icons/md";
import "./time-to-beat.scss";

export type ITimeToBeatProps = {
	hltbInfo?: {
		gameplay_main: number,
		gameplay_main_unit: string,
		gameplay_main_extra: number,
		gameplay_main_extra_unit: string,
		gameplay_completionist: number,
		gameplay_completionist_unit: string,
	},
	rawgPlayTime?: string,
	className?: string,
}

export function TimeToBeat(props: ITimeToBeatProps) {
	if (!props.hltbInfo && !props.rawgPlayTime) {
		return null;
	}

	const hltbInfo = props.hltbInfo;

	let content;
	if (props.hltbInfo) {
		content = (
			<>
				<div hidden={hltbInfo?.gameplay_main === -1} className='time-to-beat__element'>
					<MdAccessTime className='time-to-beat__icon time-to-beat__icon_green' title={"Главный сюжет"}/>
					{hltbInfo?.gameplay_main} {hltbInfo?.gameplay_main_unit}
				</div>
				<div hidden={hltbInfo?.gameplay_main_extra === -1} className='time-to-beat__element'>
					<MdAccessTime className='time-to-beat__icon time-to-beat__icon_yellow'
								  title={"Главный сюжет + побочные задания"}/>
					{hltbInfo?.gameplay_main_extra} {hltbInfo?.gameplay_main_extra_unit}
				</div>
				<div hidden={!hltbInfo || hltbInfo?.gameplay_completionist === -1} className='time-to-beat__element'>
					<MdAccessTime className='time-to-beat__icon time-to-beat__icon_red' title={"Полное прохождение"}/>
					{hltbInfo?.gameplay_completionist} {hltbInfo?.gameplay_completionist_unit}
				</div>
			</>
		);
	}
	if (!content) {
		content = (
			<div hidden={hltbInfo?.gameplay_main === -1} className='time-to-beat__element'>
				<MdAccessTime className='time-to-beat__icon time-to-beat__icon_green' title={"Время "}/>
				{props.rawgPlayTime}
			</div>
		)
	}

	return (
		<div className={classnames('time-to-beat', props.className)}>
			<p className='time-to-beat__label'>Время прохождения</p>
			{content}
		</div>
	);
}
