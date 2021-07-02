import React from "react";
import { MDBIcon } from "mdbreact";
import "./time-to-beat.sass";

function TimeToBeat({ hltbInfo }) {
	return (
		<div className='time-to-beat' hidden={!hltbInfo || hltbInfo === "0 часов" || (hltbInfo?.gameplay_main < 0 && hltbInfo?.gameplay_main_extra < 0 && hltbInfo?.gameplay_completionist < 0)}>
			<p className='time-to-beat__element'>Время прохождения: </p>
			<div hidden={hltbInfo?.gameplay_main === -1} className='time-to-beat__element'>
				<MDBIcon far icon='clock' className='time-to-beat__icon time-to-beat__icon_green' title={"Главный сюжет"} />
				{hltbInfo?.gameplay_main ? hltbInfo?.gameplay_main : hltbInfo} {hltbInfo?.gameplay_main_unit}
			</div>
			<div hidden={hltbInfo?.gameplay_main_extra === -1} className='time-to-beat__element'>
				<MDBIcon far icon='clock' className='time-to-beat__icon time-to-beat__icon_yellow' title={"Главный сюжет + побочные задания"} />
				{hltbInfo?.gameplay_main_extra} {hltbInfo?.gameplay_main_extra_unit}
			</div>
			<div hidden={!hltbInfo || hltbInfo?.gameplay_completionist === -1} className='time-to-beat__element'>
				<MDBIcon far icon='clock' className='time-to-beat__icon time-to-beat__icon_red' title={"Полное прохождение"} />
				{hltbInfo?.gameplay_completionist} {hltbInfo?.gameplay_completionist_unit}
			</div>
		</div>
	);
}

export default TimeToBeat;
