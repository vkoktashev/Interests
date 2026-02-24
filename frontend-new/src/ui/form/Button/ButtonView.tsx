import React from 'react';
import isString from 'lodash-es/isString';
import Icon from '@steroidsjs/core/ui/content/Icon';
import {useBem} from '@steroidsjs/core/hooks';
import './ButtonView.scss';

type TBadge = {
	enable?: boolean,
	color?: string,
	value?: React.ReactNode,
	className?: string,
};

type TButtonViewProps = {
	label?: React.ReactNode,
	hint?: string,
	icon?: string,
	children?: React.ReactNode,
	isLoading?: boolean,
	isFailed?: boolean,
	submitting?: boolean,
	disabled?: boolean,
	outline?: boolean,
	link?: boolean,
	block?: boolean,
	color?: string,
	size?: 'sm' | 'md' | 'lg' | string,
	tag?: 'a' | string,
	url?: string,
	href?: string,
	target?: string,
	type?: 'button' | 'submit' | 'reset',
	className?: string,
	style?: React.CSSProperties,
	onClick?: (event: React.MouseEvent<any>) => void,
	badge?: TBadge,
};

function ButtonView(props: TButtonViewProps) {
	const bem = useBem('AppButtonView');

	const renderLabel = () => {
		const title = props.label && isString(props.label)
			? props.label
			: (props.hint || null);

		return (
			<>
				{props.isLoading && (
					<Icon
						className={bem.element('loader')}
						name='loading_icon_thick'
						tabIndex={-1}
					/>
				)}

				{!props.isLoading && (
					<span title={props.hint} className={bem.element(props.link ? 'link' : 'label')}>
						{props.icon && (
							<Icon
								name={props.icon}
								title={title || undefined}
								className={bem.element('icon', !props.label && 'without-label')}
							/>
						)}
						<span className={bem.element('text')}>
							{props.children}
						</span>
					</span>
				)}
			</>
		);
	};

	const renderBadge = () => {
		if (!props.badge || !props.badge.enable) {
			return null;
		}

		return (
			<span className={bem(
				bem.element('badge', {[`${props.badge.color}`]: !!props.badge.color}),
				props.badge.className,
			)}>
				{props.badge.value}
			</span>
		);
	};

	const className = bem(
		bem.block({
			button: !props.link,
			[`color_${props.color}`]: props.color && !props.outline,
			[`outline_${props.color}`]: !!props.outline,
			outline: !!props.outline,
			size: props.size,
			disabled: !!props.disabled,
			submitting: !!props.submitting,
			loading: !!props.isLoading,
			failed: !!props.isFailed,
			link: !!props.link,
			block: !!props.block,
			[`tag-${props.tag}`]: !!props.tag,
		}),
		props.className,
	);

	if (props.tag === 'a') {
		return (
			<a
				className={className}
				href={props.href || props.url}
				onClick={props.onClick}
				style={props.style}
				target={props.target}
				rel={props.target === '_blank' ? 'noreferrer' : undefined}
			>
				{renderLabel()}
				{renderBadge()}
			</a>
		);
	}

	return (
		<button
			title={props.hint}
			type={props.type || 'button'}
			disabled={props.disabled || props.isLoading}
			onClick={props.onClick}
			style={props.style}
			className={className}
		>
			{renderLabel()}
			{renderBadge()}
		</button>
	);
}

export default ButtonView;
