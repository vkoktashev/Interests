import React, {useEffect, useMemo, useState} from 'react';
import classnames from 'classnames';
import {useBem} from '@steroidsjs/core/hooks';
import './input-number.scss';

interface IInputNumberProps {
	value: number | string | null | undefined,
	max?: number,
	min?: number,
	step?: number,
	onChange: (value: number | string) => void,
	className?: string,
	dataList?: Array<number | string>,
	placeholder?: string,
}

function clamp(value: number, min?: number, max?: number) {
	let nextValue = value;
	if (typeof min === 'number') {
		nextValue = Math.max(min, nextValue);
	}
	if (typeof max === 'number') {
		nextValue = Math.min(max, nextValue);
	}
	return nextValue;
}

function parseLocalizedNumber(rawValue: string): number | null {
	const trimmedRawValue = rawValue.trim();
	if (trimmedRawValue.endsWith(',') || trimmedRawValue.endsWith('.')) {
		return null;
	}

	const normalized = trimmedRawValue.replace(',', '.');
	if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
		return null;
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function formatDisplayValue(value: number | string | null | undefined): string {
	if (value === null || value === undefined || value === '') {
		return '';
	}
	return String(value).replace('.', ',');
}

function limitFractionToHundredths(rawValue: string): string {
	const commaIndex = rawValue.indexOf(',');
	if (commaIndex < 0) {
		return rawValue;
	}

	const integerPart = rawValue.slice(0, commaIndex + 1);
	const fractionPart = rawValue.slice(commaIndex + 1).replace(/,/g, '').slice(0, 2);
	return integerPart + fractionPart;
}

export function InputNumber({
	value,
	max,
	min,
	step = 1,
	onChange,
	className,
	dataList = [],
	placeholder,
}: IInputNumberProps) {
	const bem = useBem('input-number');
	const [inputValue, setInputValue] = useState<string>(formatDisplayValue(value));

	useEffect(() => {
		setInputValue(formatDisplayValue(value));
	}, [value]);

	const numericValue = useMemo(() => {
		const parsed = parseLocalizedNumber(inputValue);
		if (parsed !== null) {
			return parsed;
		}

		if (typeof value === 'number') {
			return value;
		}

		const parsedPropValue = parseLocalizedNumber(String(value || ''));
		return parsedPropValue ?? 0;
	}, [inputValue, value]);

	const canDecrease = typeof min !== 'number' || numericValue > min;
	const canIncrease = typeof max !== 'number' || numericValue < max;

	const commitNumericValue = (nextValue: number) => {
		const clampedValue = clamp(nextValue, min, max);
		onChange(clampedValue);
		setInputValue(formatDisplayValue(clampedValue));
	};

	return (
		<div className={classnames(bem.block(), className)}>
			<div className={bem.element('control')}>
				<button
					type='button'
					className={bem.element('button', {minus: true})}
					disabled={!canDecrease}
					onClick={() => commitNumericValue(numericValue - step)}
				>
					-
				</button>

				<input
					type='text'
					inputMode='decimal'
					placeholder={placeholder}
					value={inputValue}
					className={bem.element('input')}
					onChange={(event) => {
						const nextRawValue = event.target.value
							.replace(/\./g, ',')
							.replace(/[^\d,-]/g, '');
						const commaIndex = nextRawValue.indexOf(',');
						const normalizedValue = commaIndex >= 0
							? nextRawValue.slice(0, commaIndex + 1) + nextRawValue.slice(commaIndex + 1).replace(/,/g, '')
							: nextRawValue;
						const limitedValue = limitFractionToHundredths(normalizedValue);

						setInputValue(limitedValue);
						const parsed = parseLocalizedNumber(limitedValue);
						if (parsed !== null) {
							onChange(clamp(parsed, min, max));
						}
						if (limitedValue === '') {
							onChange('');
						}
					}}
					onBlur={() => {
						const parsed = parseLocalizedNumber(inputValue);
						if (parsed === null) {
							setInputValue(formatDisplayValue(value));
							return;
						}
						commitNumericValue(parsed);
					}}
				/>

				<button
					type='button'
					className={bem.element('button', {plus: true})}
					disabled={!canIncrease}
					onClick={() => commitNumericValue(numericValue + step)}
				>
					+
				</button>
			</div>

			{dataList.length > 0 && (
				<div className={bem.element('hints')}>
					{dataList.map((data, counter) => {
						const parsedValue = parseLocalizedNumber(String(data));
						if (parsedValue === null) {
							return null;
						}

						return (
							<button
								type='button'
								key={`${data}-${counter}`}
								onClick={() => commitNumericValue(parsedValue)}
								className={bem.element('hint')}
							>
								{formatDisplayValue(data)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
