import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import './age-rating-block.scss';

interface IAgeRatingBlockProps {
	rating?: string | null,
	text?: string,
	className?: string,
}

function formatRating(rating: string) {
	return /^\d+$/.test(rating) ? `${rating}+` : rating;
}

export function AgeRatingBlock({rating, text, className}: IAgeRatingBlockProps) {
	const bem = useBem('age-rating-block');
	const value = (rating || '').trim();

	if (!value) {
		return null;
	}

	const formattedValue = formatRating(value);

	return (
		<div className={bem(bem.block(), className)}>
			<div
				className={bem.element('body', {
					long: formattedValue.length > 3,
				})}
			>
				<p>{formattedValue}</p>
			</div>
			{/* Пустая подпись держит высоту вровень с соседними блоками */}
			<p className={bem.element('text')}>{text || ' '}</p>
		</div>
	);
}
