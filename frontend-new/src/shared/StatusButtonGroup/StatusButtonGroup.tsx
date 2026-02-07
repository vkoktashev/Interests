import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import "./status-button-group.scss";

export function StatusButtonGroup({ statuses, onChangeStatus, userStatus, className }) {
	const bem = useBem('status-button-group');
	const count = Math.max(statuses?.length || 0, 1);
	const activeIndex = Math.max(statuses?.indexOf(userStatus) || 0, 0);

	return (
		<div
			className={bem(bem.block(), className)}
			style={
				{
					'--status-count': count,
					'--active-index': activeIndex,
				} as React.CSSProperties
			}
		>
			<span className={bem.element('highlight')} aria-hidden="true" />
			{statuses.map((status, counter) => (
				<button
					className={bem.element('item', {active: userStatus === status})}
					key={status}
					type="button"
					onClick={() => {
						onChangeStatus(status);
					}}>
					{status}
				</button>
			))}
		</div>
	);
}
