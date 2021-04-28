import React from "react";

function InputNumber({ value, max, min, onChange, id, dataList }) {
	return (
		<div className='customNUD' id={id}>
			<button
				className='minusButton'
				onClick={() => {
					if (!min || parseFloat(value) > min + 1) onChange(parseFloat(value) - 1);
				}}>
				-
			</button>
			<input
				type='number'
				value={value}
				max={max ? max : ""}
				min={min ? min : ""}
				onChange={(event) => {
					if ((!min || event.target.value > min) && (!max || event.target.value < max)) onChange(parseFloat(event.target.value));
				}}
				style={{ width: `${value.toString().length * 15}px` }}
			/>
			<button
				className='plusButton'
				onClick={() => {
					if (!max || value < max - 1) onChange(parseFloat(value) + 1);
				}}>
				+
			</button>
			<div className='dataList'>
				{dataList?.map((data) => (
					<div onClick={() => onChange(parseFloat(data))}>{data}</div>
				))}
			</div>
		</div>
	);
}

export default InputNumber;
