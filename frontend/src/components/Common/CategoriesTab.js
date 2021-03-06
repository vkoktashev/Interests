import React from "react";

function CategoriesTab({ categories, activeColor, onChangeCategory, activeCategory, hidden }) {
	return (
		<div hidden={hidden} className='categoriesTabs'>
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
			<hr className='categoriesLine' />
		</div>
	);
}

export default CategoriesTab;
