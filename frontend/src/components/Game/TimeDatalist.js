import React from "react";
import { MDBIcon } from "mdbreact";

function TimeDatalist({ hltbInfo, setValue }) {
	function strToFloat(text) {
		let cleanStr = text?.replace("часов", "");
		if (cleanStr && cleanStr !== -1)
			if (cleanStr.indexOf("½") + 1) return parseFloat(cleanStr) + 0.5;
			else return parseFloat(cleanStr);
	}

	return (
		<div className='timeDatalist' hidden={!hltbInfo}>
			<div className='timeData' hidden={!hltbInfo?.gameplay_main_extra} onClick={() => setValue(strToFloat(hltbInfo?.gameplay_main_extra))}>
				<MDBIcon far icon='clock' className='yellow-text' />
				{strToFloat(hltbInfo?.gameplay_main_extra)}
			</div>
			<div className='timeData' hidden={!hltbInfo || hltbInfo === "0 часов"} onClick={() => setValue(strToFloat(hltbInfo?.gameplay_main ? hltbInfo?.gameplay_main : hltbInfo))}>
				<MDBIcon far icon='clock' className='light-green-text' />
				{strToFloat(hltbInfo?.gameplay_main ? hltbInfo?.gameplay_main : hltbInfo)}
			</div>
			<div className='timeData' hidden={!hltbInfo?.gameplay_completionist} onClick={() => setValue(hltbInfo?.gameplay_completionist)}>
				<MDBIcon far icon='clock' className='red-text' />
				{strToFloat(hltbInfo?.gameplay_completionist)}
			</div>
		</div>
	);
}

export default TimeDatalist;
