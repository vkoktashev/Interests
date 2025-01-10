import React from "react";
import {useBem} from '@steroidsjs/core/hooks';
import "./categories-tab.scss";

interface ICategoriesTabProps {
	categories: Array<string>,
	onChangeCategory: (category: string) => void,
	activeCategory: string,
	hidden?: boolean,
	children?: any,
	className?: string,
}

function CategoriesTab({ categories, onChangeCategory, activeCategory, hidden, children, className }: ICategoriesTabProps) {
	const bem = useBem('categories-tabs');
	return (
		<div hidden={hidden} className={bem(bem.block(), className)}>
			<div className={bem.element('body')}>
				{categories.map((category, counter) => (
					<button
						className={bem.element('tab', {active: activeCategory === category})}
						key={counter}
						onClick={() => {
							onChangeCategory(category);
						}}>
						{category}
					</button>
				))}
			</div>
			<div className={bem.element('content')}>
				{children}
			</div>
		</div>
	);
}

export default CategoriesTab;
