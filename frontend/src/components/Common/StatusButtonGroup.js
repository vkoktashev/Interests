import React from "react";

function StatusButtonGroup({ statuses, activeColor, onChangeStatus, userStatus }) {
	return (
		<div className='contentStatuses'>
			{statuses.map((status) => (
				<button
					className={"contentStatus"}
					key={status}
					style={{ backgroundColor: userStatus === status ? activeColor : "#000000" }}
					onClick={() => {
						onChangeStatus(status);
					}}>
					{status}
				</button>
			))}
		</div>
	);
}

export default StatusButtonGroup;
