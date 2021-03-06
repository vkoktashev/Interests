import React from "react";

function StatusButtonGroup({ statuses, activeColor, onChangeStatus, userStatus }) {
	return (
		<div className='contentStatuses'>
			{statuses.map((status, counter) => (
				<button
					className={"contentStatus" + (userStatus === status ? " active" : "")}
					key={status}
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
