import React, { useState } from "react";
import "./style.css";

function CategoriesTab({ categories, activeColor, onChangeCategory }) {
	const [activeCategory, setActiveCategory] = useState(categories[0]);

	return (
		<div>
			{categories.map((category, counter) => (
				<button
					className={"categoriesTab"}
					key={counter}
					style={{ color: activeCategory === category ? activeColor : "rgb(207, 207, 207)" }}
					onClick={() => {
						setActiveCategory(category);
						onChangeCategory(category);
					}}>
					{category}
				</button>
			))}
			<hr style={{ backgroundColor: activeColor, height: 2.5, marginTop: "0px", marginBottom: "10px" }} />
		</div>
	);
}

export default CategoriesTab;
