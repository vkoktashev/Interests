import React from "react";

function InputNumber({ value, max, min, onChange }) {
	return (
		<div>
			<div className='customNUD'>
				<button
					className='minusButton'
					onClick={() => {
						if (!min || value > min + 1) onChange(parseInt(value) - 1);
					}}>
					-
				</button>
				<input
					type='number'
					value={value}
					max={max ? max : ""}
					min={min ? min : ""}
					onChange={(event) => {
						if ((!min || event.target.value > min) && (!max || event.target.value < max)) onChange(event.target.value);
					}}
				/>
				<button
					className='plusButton'
					onClick={() => {
						if (!max || value < max - 1) onChange(parseInt(value) + 1);
					}}>
					+
				</button>
			</div>
		</div>
	);
}

export default InputNumber;
