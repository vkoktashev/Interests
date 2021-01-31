import React from "react";
import "./style.css";

function CategoriesTab({ categories, activeColor, onChangeCategory, activeCategory, hidden }) {
	return (
		<div hidden={hidden}>
			{categories.map((category, counter) => (
				<button
					className={"categoriesTab"}
					key={counter}
					style={{ color: activeCategory === category ? activeColor : "rgb(207, 207, 207)" }}
					onClick={() => {
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
