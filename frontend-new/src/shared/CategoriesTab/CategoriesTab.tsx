import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import "./categories-tab.scss";

interface ICategoriesTabProps {
	categories: string[];
	onChangeCategory: (category: string) => void;
	activeCategory: string;
	hidden?: boolean;
	children?: React.ReactNode;
	className?: string;
}

function CategoriesTab({ categories, onChangeCategory, activeCategory, hidden, children, className }: ICategoriesTabProps) {
	const bem = useBem('categories-tabs');
	const contentId = React.useId();

	return (
		<div hidden={hidden} className={bem(bem.block(), className)}>
			<div className={bem.element('body')} role='tablist' aria-label='Категории'>
				{categories.map((category, counter) => (
					<button
						type='button'
						role='tab'
						aria-selected={activeCategory === category}
						aria-controls={contentId}
						className={bem.element('tab', {active: activeCategory === category})}
						key={`${category}-${counter}`}
						onClick={() => onChangeCategory(category)}>
						{category}
					</button>
				))}
			</div>
			<div className={bem.element('content')} id={contentId} role='tabpanel'>
				{children}
			</div>
		</div>
	);
}

export default CategoriesTab;
