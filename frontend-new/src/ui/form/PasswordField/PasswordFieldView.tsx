import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {InputType} from '@steroidsjs/core/ui/form/PasswordField/PasswordField';
import {FaEye, FaEyeSlash} from 'react-icons/fa';
import './PasswordFieldView.scss';

type TPasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	value?: string | number,
	type?: string,
};

type TPasswordFieldViewProps = {
	className?: string,
	style?: React.CSSProperties,
	size?: 'sm' | 'md' | 'lg' | string,
	disabled?: boolean,
	required?: boolean,
	id?: string,
	errors?: any,
	input?: {value?: any},
	inputProps: TPasswordInputProps,
	inputRef?: React.Ref<HTMLInputElement>,
	showSecurityIcon?: boolean,
	showSecurityBar?: boolean,
	securityLevel?: string,
	onShowButtonClick?: () => void,
};

function PasswordFieldView(props: TPasswordFieldViewProps) {
	const bem = useBem('AppPasswordFieldView');
	const isDisabled = !!(props.disabled ?? props.inputProps?.disabled);
	const isFilled = !!(props.input?.value ?? props.inputProps?.value);
	const isPasswordType = (props.inputProps?.type || InputType.PASSWORD) === InputType.PASSWORD;

	return (
		<div
			className={bem(bem.block({
				size: props.size,
				disabled: isDisabled,
				hasError: !!props.errors,
				filled: isFilled,
				hasSecurityIcon: !!props.showSecurityIcon,
				hasSecurityBar: !!props.showSecurityBar,
			}), props.className)}
			style={props.style}
		>
			<div className={bem.element('input-wrapper')}>
				<input
					{...props.inputProps}
					type={props.inputProps?.type}
					disabled={isDisabled}
					required={props.required}
					id={props.id}
					ref={props.inputRef}
					className={bem.element('input')}
				/>

				{props.showSecurityIcon && (
					<button
						type='button'
						className={bem.element('toggle', {opened: !isPasswordType})}
						onClick={props.onShowButtonClick}
						tabIndex={-1}
						aria-label={isPasswordType ? 'Показать пароль' : 'Скрыть пароль'}
					>
						{isPasswordType ? (
							<FaEye className={bem.element('toggle-icon')} />
						) : (
							<FaEyeSlash className={bem.element('toggle-icon')} />
						)}
					</button>
				)}
			</div>

			{props.showSecurityBar && (
				<div className={bem.element('security')}>
					<div className={bem.element('security-track')}>
						<div className={bem.element('security-fill', {level: props.securityLevel || 'none'})} />
					</div>
				</div>
			)}
		</div>
	);
}

export default PasswordFieldView;
