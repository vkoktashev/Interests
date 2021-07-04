import React from "react";
import { FaStar, FaRegStar } from "react-icons/fa";
import Rating from "react-rating";

function RatingBlock({ initialRating, readonly, onChange, size, className }) {
	return (
		<Rating
			stop={10}
			emptySymbol={<FaRegStar far icon='star' style={{ fontSize: size }} />}
			fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
				<FaStar icon='star' style={{ fontSize: size }} title={n} />
			))}
			initialRating={initialRating}
			readonly={readonly}
			onChange={onChange}
			className={className}
		/>
	);
}

export default RatingBlock;
