import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import Icon from '@steroidsjs/core/ui/content/Icon';
import {DropDown} from '@steroidsjs/core/ui/content';
import {getSelectedItemsCount, getSelectedItemsLabel} from '@steroidsjs/bootstrap/form/DropDownField/utils';
import './DropDownFieldView.scss';

type TDropDownFieldViewProps = {
	className?: string,
	style?: React.CSSProperties,
	size?: 'sm' | 'md' | 'lg' | string,
	color?: string,
	outline?: boolean,
	errors?: any,
	disabled?: boolean,
	isOpened: boolean,
	onOpen: () => void,
	onClose: () => void,
	onReset: () => void,
	showReset?: boolean,
	selectedIds: Array<string | number>,
	selectedItems: any[],
	placeholder?: string,
	showEllipses?: boolean,
	inputRef?: React.Ref<HTMLInputElement>,
	dropDownProps?: Record<string, any>,
	maxHeight?: string | number,
	isAutoComplete?: boolean,
	isSearchAutoFocus?: boolean,
	autoCompleteInputForwardedRef: React.MutableRefObject<HTMLInputElement | null>,
	searchInputProps: any,
	items: any[],
	renderItem: (item: any) => React.ReactNode,
	multiple?: boolean,
	itemToSelectAll?: any,
};

function DropDownFieldView(props: TDropDownFieldViewProps) {
	const bem = useBem('AppDropDownFieldView');
	const fieldRef = React.useRef<HTMLDivElement | null>(null);

	const setFocusOnAutoCompleteInput = React.useCallback((isComponentVisible: boolean) => {
		if (isComponentVisible && props.autoCompleteInputForwardedRef?.current && props.isSearchAutoFocus) {
			props.autoCompleteInputForwardedRef.current.focus();
		}
	}, [props.autoCompleteInputForwardedRef, props.isSearchAutoFocus]);

	const renderPlaceholder = React.useCallback(() => (
		props.placeholder && !props.selectedIds?.length
			? <div className={bem.element('placeholder')}>{props.placeholder}</div>
			: null
	), [bem, props.placeholder, props.selectedIds]);

	const menuWidth = React.useMemo(() => {
		if (!fieldRef.current) {
			return 0;
		}
		return fieldRef.current.getBoundingClientRect().width;
	}, [props.isOpened]);

	const renderList = React.useCallback(() => (
		<div
			className={bem.element('drop-down')}
			style={{
				['--width' as any]: `${menuWidth}px`,
				['--maxHeight' as any]: props.maxHeight,
			}}
		>
			{props.isAutoComplete && (
				<div className={bem.element('search', {size: props.size})}>
					<Icon name='search' className={bem.element('search-icon')} />
					<input
						{...props.searchInputProps}
						ref={props.autoCompleteInputForwardedRef}
						onChange={(e) => props.searchInputProps.onChange(e.target.value)}
						className={bem(bem.element('search-input'), props.searchInputProps.className)}
					/>
				</div>
			)}

			<div className={bem.element('drop-down-list')}>
				{props.multiple && props.itemToSelectAll && props.renderItem(props.itemToSelectAll)}
				{props.items.map(item => props.renderItem(item))}
			</div>
		</div>
	), [bem, menuWidth, props]);

	const closeIfOpened = React.useCallback(() => {
		if (props.isOpened) {
			props.onClose();
		}
	}, [props.isOpened, props.onClose]);

	return (
		<DropDown
			content={renderList}
			onVisibleChange={setFocusOnAutoCompleteInput}
			visible={props.isOpened}
			onClose={props.onClose}
			hasArrow={false}
			className={bem.element('wrapper')}
			{...props.dropDownProps}
		>
			<div>
				<div
					ref={fieldRef}
					role='button'
					tabIndex={0}
					onClick={closeIfOpened}
					onKeyPress={(e) => e.key === 'Enter' && !props.disabled && props.onOpen()}
					style={props.style}
					className={bem(bem.block({
						size: props.size,
						[`${props.color}`]: !!props.color && !props.outline,
						[`outline_${props.color}`]: !!props.outline,
						opened: props.isOpened,
						'is-invalid': !!props.errors,
						disabled: props.disabled,
					}), props.className)}
				>
					<div
						className={bem.element('selected-items', {reset: props.showReset})}
						onClick={props.onOpen}
						tabIndex={-1}
						role='button'
					>
						{renderPlaceholder()}
						<span className={bem.element('selected-items-text')}>
							{props.showEllipses
								? getSelectedItemsLabel(props.selectedItems)
								: getSelectedItemsCount(props.selectedItems)}
						</span>
						<input className={bem.element('input')} ref={props.inputRef} disabled={props.disabled} />
					</div>

					{props.showReset && props.selectedIds.length > 0 && (
						<Icon
							name='cross_8x8'
							className={bem.element('icon-close')}
							tabIndex={-1}
							onClick={props.onReset}
							aria-label={__('Сбросить')}
						/>
					)}

					<Icon
						name='arrow_down_24x24'
						className={bem.element('icon-chevron')}
						tabIndex={-1}
						onClick={props.onOpen}
					/>
				</div>
			</div>
		</DropDown>
	);
}

export default DropDownFieldView;
