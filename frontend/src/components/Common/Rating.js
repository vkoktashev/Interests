import React from "react";
import { MDBIcon } from "mdbreact";
import "./style.css";

import Rating from "react-rating";

function RatingBlock({ initialRating, readonly, onChange, size }) {
	return (
		<Rating
			stop={10}
			emptySymbol={<MDBIcon far icon='star' size='1x' style={{ fontSize: size }} />}
			fullSymbol={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
				<MDBIcon icon='star' size='1x' style={{ fontSize: size }} title={n} />
			))}
			initialRating={initialRating}
			readonly={readonly}
			onChange={onChange}
			style={{ marginBottom: "10px" }}
		/>
	);
}

export default RatingBlock;
