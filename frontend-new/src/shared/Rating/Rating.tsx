import React from "react";
import { FaStar, FaRegStar, FaEyeSlash, FaEye } from "react-icons/fa";
import Rating from "react-rating";
import "./rating.scss";

export function RatingBlock({ initialRating, readonly, disabled, onChange, className, withEye }: any) {
	return (
		// @ts-ignore
		<Rating
			start={withEye ? -1 : 0}
			stop={10}
			emptySymbol={(withEye? [<FaEyeSlash />] : []).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaRegStar title={n.toString()} />))}
			fullSymbol={(withEye ? [<FaEye />] : []).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <FaStar title={n.toString()} />))}
			initialRating={initialRating}
			readonly={readonly || disabled}
			onClick={(value) => {
				if (value !== initialRating) {
					onChange(value);
				} else {
					onChange(0);
				}
			}}
			className={[className, disabled && 'rating-block_disabled'].filter(Boolean).join(' ')}
			quiet
		/>
	);
}
