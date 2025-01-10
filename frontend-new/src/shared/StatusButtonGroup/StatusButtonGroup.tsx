import React from "react";
import classnames from "classnames";
import "./status-button-group.scss";

export function StatusButtonGroup({ statuses, onChangeStatus, userStatus, className }) {
	return (
		<div className={classnames("content-statuses", className)}>
			{statuses.map((status, counter) => (
				<button
					className={classnames("content-statuses__content-status", userStatus === status ? "content-statuses__content-status_active" : "")}
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
