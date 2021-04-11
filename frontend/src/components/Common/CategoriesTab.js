import React from "react";

function CategoriesTab({ categories, onChangeCategory, activeCategory, hidden, children }) {
	return (
		<div hidden={hidden} className='categoriesTabs'>
			<div className='tabs'>
				{categories.map((category, counter) => (
					<button
						className={"categoriesTab" + (activeCategory === category ? " active" : "")}
						key={counter}
						onClick={() => {
							onChangeCategory(category);
						}}>
						{category}
					</button>
				))}
			</div>
			<div className='categoryContent'>{children}</div>
		</div>
	);
}

export default CategoriesTab;
