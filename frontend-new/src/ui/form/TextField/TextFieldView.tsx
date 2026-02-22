import React, {useEffect} from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import Icon from '@steroidsjs/core/ui/content/Icon';
import './TextFieldView.scss';

type TTextFieldInputProps = {
	name?: string,
	onChange?: (value: string | React.ChangeEvent<HTMLTextAreaElement>) => void,
	onKeyUp?: React.KeyboardEventHandler,
	value?: string | number,
	placeholder?: string,
	disabled?: boolean,
	required?: boolean,
	ref?: React.MutableRefObject<HTMLTextAreaElement | null>,
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

type TTextFieldViewProps = {
	className?: string,
	style?: React.CSSProperties,
	size?: 'sm' | 'md' | 'lg' | string,
	errors?: any,
	autoHeight?: boolean,
	showClear?: boolean,
	id?: string,
	disabled?: boolean,
	required?: boolean,
	inputProps: TTextFieldInputProps,
	onClear?: () => void,
};

function TextFieldView(props: TTextFieldViewProps) {
	const bem = useBem('AppTextFieldView');
	const textareaRef = props.inputProps?.ref;
	const isDisabled = !!(props.disabled ?? props.inputProps?.disabled);
	const isFilled = String(props.inputProps?.value ?? '').length > 0;

	useEffect(() => {
		if (!props.autoHeight || !textareaRef?.current) {
			return;
		}

		const inputElement = textareaRef.current;
		const inputElementComputedStyles = window.getComputedStyle(inputElement);
		const borderTopWidth = parseInt(inputElementComputedStyles.borderTopWidth, 10) || 0;
		const borderBottomWidth = parseInt(inputElementComputedStyles.borderBottomWidth, 10) || 0;

		// Reset height before recalculation so shrinking works too.
		inputElement.style.height = 'auto';
		inputElement.style.height = `${inputElement.scrollHeight + borderTopWidth + borderBottomWidth}px`;
	}, [textareaRef, props.inputProps?.value, props.autoHeight]);

	return (
		<div
			className={bem(bem.block({
				hasError: !!props.errors,
				filled: isFilled,
				size: props.size,
				disabled: isDisabled,
				hasClear: !!(props.showClear && !isDisabled),
			}), props.className)}
			style={props.style}
		>
			<textarea
				{...props.inputProps}
				className={bem.element('textarea')}
				id={props.id}
				placeholder={props.inputProps?.placeholder}
				disabled={isDisabled}
				required={props.required ?? props.inputProps?.required}
			/>

			{props.showClear && !isDisabled && isFilled && (
				<Icon
					className={bem.element('clear')}
					name='cross_8x8'
					onClick={props.onClear}
				/>
			)}
		</div>
	);
}

export default TextFieldView;
