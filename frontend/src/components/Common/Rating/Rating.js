import React from "react";
import { FaStar, FaRegStar, FaEyeSlash, FaEye } from "react-icons/fa";
import Rating from "react-rating";

function RatingBlock({ initialRating, readonly, onChange, className, withEye }) {
	return (
		<Rating
			start={withEye ? -1 : 0}
			stop={10}
			emptySymbol={(withEye ? [<FaEyeSlash />] : []).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaRegStar />))}
			fullSymbol={(withEye ? [<FaEye />] : []).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaStar title={n} />))}
			initialRating={initialRating}
			readonly={readonly}
			onChange={onChange}
			className={className}
		/>
	);
}

export default RatingBlock;
