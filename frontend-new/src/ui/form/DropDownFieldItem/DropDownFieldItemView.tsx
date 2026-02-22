import React from 'react';
import useBem from '@steroidsjs/core/hooks/useBem';
import {
	CHECKBOX_CONTENT_TYPE,
	GROUP_CONTENT_TYPE,
	ICON_CONTENT_TYPE,
	IMG_CONTENT_TYPE,
	RADIO_CONTENT_TYPE,
} from '@steroidsjs/core/ui/form/DropDownField/DropDownField';
import renderIcon from '@steroidsjs/bootstrap/utils/renderIcon';
import AccordionItemView from '@steroidsjs/bootstrap/content/Accordion/AccordionItemView';
import CheckboxFieldView from '@steroidsjs/bootstrap/form/CheckboxField/CheckboxFieldView';
import RadioFieldView from '@steroidsjs/bootstrap/form/RadioField/RadioFieldView';
import './DropDownFieldItemView.scss';

function DropDownItemView(props: any) {
	const bem = useBem('AppDropDownItemView');
	const uniqItemId = props.item[props.primaryKey];

	const commonProps = {
		className: bem.element('option', {
			hover: props.hoveredId === uniqItemId,
			select: props.isItemToSelectAll ? props.isSelectedAll : props.selectedIds.includes(uniqItemId),
			size: props.size,
		}),
		onFocus: () => props.onItemHover(uniqItemId),
		onMouseOver: () => props.onItemHover(uniqItemId),
		onClick: (e: React.MouseEvent) => {
			e.preventDefault();
			props.onItemSelect(uniqItemId);
		},
	};

	switch (props.type) {
		case GROUP_CONTENT_TYPE:
			return (
				<AccordionItemView
					isShowMore={props.isShowMore}
					childIndex={props.childIndex}
					toggleCollapse={props.toggleCollapse}
					toggleAccordion={() => {}}
					showIcon
					title={props.item.label}
					position='middle'
					key={uniqItemId}
					className={bem.element('group', {size: props.size})}
				>
					{props.item[props.groupAttribute]?.map((subItem: any, itemIndex: number) => (
						<DropDownItemView
							{...props}
							type={subItem.type ? subItem.type : props.itemsContent.type}
							key={itemIndex}
							item={subItem}
						/>
					))}
				</AccordionItemView>
			);

		case ICON_CONTENT_TYPE:
			return (
				<div {...commonProps} key={uniqItemId}>
					{renderIcon(props.item.contentSrc, {className: bem.element('icon')})}
					<span className={bem.element('label')}>{props.item.label}</span>
				</div>
			);

		case CHECKBOX_CONTENT_TYPE:
			return (
				<div {...commonProps} key={uniqItemId}>
					<CheckboxFieldView
						label={props.item.label}
						className={bem.element('checkbox')}
						size={props.size}
						inputProps={{
							disabled: false,
							name: props.item.label,
							checked: props.selectedIds.includes(uniqItemId),
							onChange: () => {},
							type: 'checkbox',
						}}
					/>
				</div>
			);

		case RADIO_CONTENT_TYPE:
			return (
				<div {...commonProps} key={uniqItemId}>
					<RadioFieldView
						label={props.item.label}
						className={bem.element('radio', {size: props.size})}
						size={props.size}
						inputProps={{
							disabled: false,
							name: props.item.label,
							checked: props.selectedIds.includes(uniqItemId),
							onChange: () => {},
							type: 'radio',
						}}
						checked={props.selectedIds.includes(uniqItemId)}
					/>
				</div>
			);

		case IMG_CONTENT_TYPE:
			return (
				<div {...commonProps} key={uniqItemId}>
					<span className={bem.element('img')}>
						<img src={props.item.contentSrc} alt='custom source for item' />
					</span>
					<span className={bem.element('label')}>{props.item.label}</span>
				</div>
			);

		default:
			return (
				<div {...commonProps} key={uniqItemId}>
					<span className={bem.element('label')}>{props.item.label}</span>
				</div>
			);
	}
}

export default DropDownItemView;
