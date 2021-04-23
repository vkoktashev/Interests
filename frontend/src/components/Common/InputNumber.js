import React from "react";

function InputNumber({ value, max, min, onChange }) {
	return (
		<div className='customNUD'>
			<button
				className='minusButton'
				onClick={() => {
					if (value > min + 1) onChange(parseInt(value) - 1);
				}}>
				-
			</button>
			<input
				type='number'
				id='userGamesCountInput'
				value={value}
				max='999'
				min='1'
				onChange={(event) => {
					if (event.target.value > min && event.target.value < max) onChange(event.target.value);
				}}
			/>
			<button
				className='plusButton'
				onClick={() => {
					if (value < max - 1) onChange(parseInt(value) + 1);
				}}>
				+
			</button>
		</div>
	);
}

export default InputNumber;
