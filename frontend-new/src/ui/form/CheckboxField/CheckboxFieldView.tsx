import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import useUniqueId from '@steroidsjs/core/hooks/useUniqueId';
import './CheckboxFieldView.scss';

type TCheckboxFieldViewProps = {
	className?: string,
	style?: React.CSSProperties,
	size?: 'sm' | 'md' | 'lg' | string,
	errors?: any,
	color?: string,
	label?: React.ReactNode,
	disabled?: boolean,
	required?: boolean,
	id?: string,
	onChange?: (e: React.MouseEvent<HTMLDivElement>) => void,
	hasOnlyLeafCheckboxes?: boolean,
	inputProps: React.InputHTMLAttributes<HTMLInputElement>,
};

function CheckboxFieldView(props: TCheckboxFieldViewProps) {
	const bem = useBem('AppCheckboxFieldView');
	const generatedId = useUniqueId('checkbox');
	const inputId = props.id || generatedId;

	return (
		<div
			className={bem(bem.block({
				size: props.size,
				hasErrors: !!props.errors,
				disabled: !!props.disabled,
				checked: !!props.inputProps?.checked,
				indeterminate: !!(props.inputProps as any)?.indeterminate,
			}), props.className)}
			style={{
				...props.style,
				['--checkbox-custom-color' as any]: props.color || undefined,
			}}
			onClick={props.onChange}
		>
			<input
				{...props.inputProps}
				id={inputId}
				disabled={props.disabled}
				required={props.required}
				className={bem.element('input', {hasCustomColor: !!props.color})}
			/>

			<label
				htmlFor={inputId}
				className={bem.element('label', {
					'has-label-only': props.hasOnlyLeafCheckboxes && !props.id,
				})}
			>
				<span className={bem.element('control')}>
					<span className={bem.element('mark')} />
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

export default CheckboxFieldView;
