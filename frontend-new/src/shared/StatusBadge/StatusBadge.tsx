import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';

import type {TMediaStatusTone} from '../mediaStatus';
import './status-badge.scss';

interface IStatusBadgeProps {
	label: string;
	tone?: TMediaStatusTone;
	size?: 'sm' | 'md';
	className?: string;
}

function StatusBadge(props: IStatusBadgeProps) {
	const bem = useBem('status-badge');
	const modifiers: Record<string, boolean> = {
		sm: props.size === 'sm',
	};
	if (props.tone) {
		modifiers[props.tone] = true;
	}

	return (
		<span className={bem(bem.block(modifiers), props.className)}>
			{props.label}
		</span>
	);
}

export default StatusBadge;
