import React from "react";
import { FaStar, FaRegStar, FaEyeSlash, FaEye } from "react-icons/fa";
import Rating from "react-rating";

export function RatingBlock({ initialRating, readonly, onChange, className, withEye }: any) {
	return (
		// @ts-ignore
		<Rating
			start={withEye ? -1 : 0}
			stop={10}
			emptySymbol={(withEye? [<FaEyeSlash />] : []).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaRegStar title={n.toString()} />))}
			fullSymbol={(withEye ? [<FaEye />] : []).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaStar title={n.toString()} />))}
			initialRating={initialRating}
			readonly={readonly}
			onClick={(value) => {
				if (value !== initialRating) {
					onChange(value);
				} else {
					onChange(0);
				}
			}}
			className={className}
			quiet
		/>
	);
}
