import React from "react";
import classnames from "classnames";
import "./input-number.scss";

export function InputNumber({ value, max, min, onChange, className, dataList }: any) {
	return (
		<div className={classnames("input-number", className)}>
			<button
				className='input-number__minus'
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
				className='input-number__input'
				style={{width: `${value.toString().length * 15}px`}}
			/>
			<button
				className='input-number__plus'
				onClick={() => {
					if (!max || value < max - 1) onChange(parseFloat(value) + 1);
				}}>
				+
			</button>
			{
				dataList.length > 0 && (
					<div className='input-number__hints'>
						{dataList?.map((data, counter) => (
							<div key={counter} onClick={() => onChange(parseFloat(data))} className='input-number__hint'>
								{data}
							</div>
						))}
					</div>
				)
			}
		</div>
	);
}
