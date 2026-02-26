import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import useUniqueId from '@steroidsjs/core/hooks/useUniqueId';
import './RadioListFieldView.scss';

type TRadioListItem = {
	id: string | number | boolean;
	label?: React.ReactNode;
	disabled?: boolean;
	required?: boolean;
	size?: string;
};

type TRadioRenderProps = {
	key: React.Key;
	id: string;
	label?: React.ReactNode;
	inputProps: {
		name: string;
		type: string;
		checked: boolean;
		onChange: () => void;
		disabled?: boolean;
	};
	size?: string;
	required?: boolean;
};

type TRadioListFieldViewProps = {
	className?: string;
	orientation?: 'vertical' | 'horizontal' | string;
	items: TRadioListItem[];
	selectedIds: Array<string | number | boolean>;
	onItemSelect: (id: string | number | boolean) => void;
	renderItem: (props: TRadioRenderProps) => JSX.Element;
	disabled?: boolean;
	size?: string;
};

function RadioListFieldView(props: TRadioListFieldViewProps) {
	const bem = useBem('AppRadioListFieldView');
	const prefix = useUniqueId('radio-list');

	return (
		<div
			className={bem(bem.block({
				[(props.orientation || 'vertical') as string]: true,
				disabled: !!props.disabled,
			}), props.className)}
		>
			{props.items.map((radio, index) => (
				<div className={bem.element('item')} key={`${radio.id}-${index}`}>
					{props.renderItem({
						key: index,
						id: `${prefix}_${String(radio.id)}`,
						label: radio.label,
						inputProps: {
							name: `${prefix}_${String(radio.id)}`,
							type: 'radio',
							checked: props.selectedIds.includes(radio.id),
							onChange: () => props.onItemSelect(radio.id),
							disabled: props.disabled || radio.disabled,
						},
						size: radio.size || props.size,
						required: radio.required,
					})}
				</div>
			))}
		</div>
	);
}

export default RadioListFieldView;
