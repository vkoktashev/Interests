import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import Icon from '@steroidsjs/core/ui/content/Icon';
import renderIcon from '@steroidsjs/bootstrap/utils/renderIcon';
import './InputFieldView.scss';

type TInputFieldViewProps = {
	className?: string,
	style?: React.CSSProperties,
	size?: 'sm' | 'md' | 'lg' | string,
	disabled?: boolean,
	errors?: any,
	leadIcon?: any,
	showClear?: boolean,
	addonAfter?: React.ReactNode,
	addonBefore?: React.ReactNode,
	textAfter?: React.ReactNode,
	textBefore?: React.ReactNode,
	input?: {value?: any},
	inputProps: React.InputHTMLAttributes<HTMLInputElement> & {value?: any, type?: string},
	maskOptions?: any,
	maskProps?: any,
	placeholder?: string,
	required?: boolean,
	id?: string,
	inputRef?: React.Ref<HTMLInputElement>,
	onClear?: () => void,
	onBlur?: React.FocusEventHandler<HTMLInputElement>,
	onFocus?: React.FocusEventHandler<HTMLInputElement>,
	onMouseDown?: React.MouseEventHandler<HTMLInputElement>,
};

function InputFieldView(props: TInputFieldViewProps) {
	const bem = useBem('AppInputFieldView');
	const isFilled = !!props.input?.value || !!props.inputProps?.value;
	const hasClear = !!(props.showClear && !props.disabled);

	const inputElement = (
		<input
			{...props.inputProps}
			onBlur={props.maskOptions ? props.onBlur : props.inputProps.onBlur}
			onFocus={props.maskOptions ? props.onFocus : props.inputProps.onFocus}
			onMouseDown={props.maskOptions ? props.onMouseDown : props.inputProps.onMouseDown}
			type={props.inputProps?.type}
			placeholder={props.placeholder}
			disabled={props.disabled}
			required={props.required}
			id={props.id}
			ref={props.inputRef}
			className={bem.element('input', {size: props.size})}
		/>
	);

	return (
		<div
			className={bem(bem.block({
				disabled: props.disabled,
				size: props.size,
				hasError: !!props.errors,
				hasLeadIcon: !!props.leadIcon,
				hasClearIcon: hasClear,
				filled: isFilled,
				hasAddonAfter: !!props.addonAfter,
				hasAddonBefore: !!props.addonBefore,
				hasAddon: !!props.addonAfter || !!props.addonBefore,
				hasTextAddon: !!props.textAfter || !!props.textBefore,
				hasTextAddonBefore: !!props.textBefore,
				hasTextAddonAfter: !!props.textAfter,
			}), props.className)}
			style={props.style}
		>
			{props.textBefore && (
				<span className={bem.element('text-before')}>
					{props.textBefore}
				</span>
			)}

			<div className={bem.element('input-wrapper')}>
				{props.addonBefore && (
					<span className={bem.element('addon-before')}>
						{props.addonBefore}
					</span>
				)}

				{props.leadIcon && renderIcon(props.leadIcon, {
					className: bem.element('lead-icon'),
					tabIndex: -1,
				})}

				{inputElement}

				{!props.disabled && props.showClear && !props.maskProps && !!props.inputProps.value && (
					<Icon
						name='cross_8x8'
						className={bem.element('icon-clear')}
						tabIndex={-1}
						onClick={props.onClear}
					/>
				)}

				{props.addonAfter && (
					<span className={bem.element('addon-after')}>
						{props.addonAfter}
					</span>
				)}
			</div>

			{props.textAfter && (
				<span className={bem.element('text-after')}>
					{props.textAfter}
				</span>
			)}
		</div>
	);
}

export default InputFieldView;
