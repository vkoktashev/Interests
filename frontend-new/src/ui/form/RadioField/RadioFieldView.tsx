import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import useUniqueId from '@steroidsjs/core/hooks/useUniqueId';
import './RadioFieldView.scss';

type TRadioFieldViewProps = {
	className?: string;
	style?: React.CSSProperties;
	size?: 'sm' | 'md' | 'lg' | string;
	errors?: any;
	label?: React.ReactNode;
	disabled?: boolean;
	required?: boolean;
	id?: string;
	onChange?: (e: React.MouseEvent<HTMLDivElement>) => void;
	checked?: boolean;
	inputProps: React.InputHTMLAttributes<HTMLInputElement>;
};

function RadioFieldView(props: TRadioFieldViewProps) {
	const bem = useBem('AppRadioFieldView');
	const generatedId = useUniqueId('radio');
	const inputId = props.id || generatedId;
	const isChecked = !!(props.checked ?? props.inputProps?.checked);

	return (
		<div
			className={bem(bem.block({
				size: props.size,
				hasError: !!props.errors,
				disabled: !!props.disabled,
				checked: isChecked,
			}), props.className)}
			style={props.style}
			onClick={props.onChange}
		>
			<input
				{...props.inputProps}
				id={inputId}
				type='radio'
				disabled={props.disabled}
				required={props.required}
				className={bem.element('input', {checked: isChecked})}
			/>
			<label htmlFor={inputId} className={bem.element('label')}>
				<span className={bem.element('control')}>
					<span className={bem.element('dot')} />
				</span>
				{props.label && (
					<span className={bem.element('label-text', {required: props.required})}>
						{props.label}
					</span>
				)}
			</label>
		</div>
	);
}

export default RadioFieldView;
