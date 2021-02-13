import React from "react";
import { MDBIcon } from "mdbreact";

function TimeToBeat({ hltbInfo }) {
	return (
		<div hidden={(hltbInfo.gameplay_main < 0) & (hltbInfo.gameplay_main_extra < 0) & (hltbInfo.gameplay_completionist < 0)}>
			<p style={{ display: "inline" }}>Время прохождения: </p>
			<div hidden={hltbInfo.gameplay_main < 0} style={{ display: "inline" }}>
				<MDBIcon far icon='clock' className='light-green-text' title={"Главный сюжет"} />
				<span className='hs' />
				{hltbInfo.gameplay_main} {hltbInfo.gameplay_main_unit}
				<span className='hs' />
			</div>{" "}
			<p style={{ display: "inline" }}> </p>
			<div hidden={hltbInfo.gameplay_main_extra < 0} style={{ display: "inline" }}>
				<MDBIcon far icon='clock' className='yellow-text' title={"Главный сюжет + побочные задания"} />
				<span className='hs' />
				{hltbInfo.gameplay_main_extra} {hltbInfo.gameplay_main_extra_unit}
				<span className='hs' />
			</div>{" "}
			<p style={{ display: "inline" }}> </p>
			<div hidden={hltbInfo.gameplay_completionist < 0} style={{ display: "inline" }}>
				<MDBIcon far icon='clock' className='red-text' title={"Полное прохождение"} />
				<span className='hs' />
				{hltbInfo.gameplay_completionist} {hltbInfo.gameplay_completionist_unit}
			</div>
		</div>
	);
}

export default TimeToBeat;
