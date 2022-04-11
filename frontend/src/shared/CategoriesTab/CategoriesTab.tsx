import React from "react";
import classnames from "classnames";
import "./categories-tab.sass";

interface ICategoriesTabProps {
	categories: Array<string>,
	onChangeCategory: (category: string) => void,
	activeCategory: string,
	hidden?: boolean,
	children?: any,
	className?: string,
}

function CategoriesTab({ categories, onChangeCategory, activeCategory, hidden, children, className }: ICategoriesTabProps) {
	return (
		<div hidden={hidden} className={classnames("categories-tabs", className)}>
			<div className='categories-tabs__body'>
				{categories.map((category, counter) => (
					<button
						className={classnames("categories-tabs__tab", activeCategory === category ? "categories-tabs__tab_active" : "")}
						key={counter}
						onClick={() => {
							onChangeCategory(category);
						}}>
						{category}
					</button>
				))}
			</div>
			<div className='categories-tabs__content'>{children}</div>
		</div>
	);
}

export default CategoriesTab;
