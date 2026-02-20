import React from 'react';
import {FaClock, FaStar} from 'react-icons/fa';
import Image from '../../../../../shared/Image';
import './item-row.scss';

interface IItemField {
	key: string;
	label: string;
}

interface IItemRowData {
	name: string;
	link?: string;
	poster?: string;
	status?: string;
	score?: number;
	spent_time?: number;
	review?: string;
}

interface IItemRowProps {
	data: IItemRowData;
	fields: IItemField[];
}

function parseNumericValue(value: unknown): number | null {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? null : value;
	}
	const parsed = parseFloat(String(value ?? ''));
	return Number.isNaN(parsed) ? null : parsed;
}

function formatScore(score?: number): string {
	const parsed = parseNumericValue(score);
	if (parsed === null) {
		return '-';
	}
	return `${parsed}/10`;
}

function formatSpentTime(value?: number): string {
	const parsed = parseNumericValue(value);
	if (parsed === null) {
		return '-';
	}
	return `${parsed}`;
}

function ItemRow({data, fields}: IItemRowProps) {
	const hasReview = Boolean(data.review && String(data.review).trim());
	const hasSpentTime = fields.some(field => field.key === 'spent_time');
	const itemName = data.name || 'Без названия';
	const itemLink = data.link || '#';
	const hasPoster = Boolean(data.poster);

	return (
		<article className='item-row'>
			<div className='item-row__main'>
				<div className='item-row__media'>
					{hasPoster ? (
						<Image className='item-row__poster' src={data.poster} alt={itemName} />
					) : (
						<div className='item-row__poster-placeholder'>
							{itemName.charAt(0).toUpperCase()}
						</div>
					)}
				</div>

				<div className='item-row__content'>
					<a href={itemLink} className='item-row__name' title={itemName}>
						{itemName}
					</a>
				</div>

				<div className='item-row__aside'>
					<div className='item-row__meta'>
						<div className='item-row__meta-item item-row__meta-item_status'>
							<span className='item-row__meta-label'>Статус</span>
							<span className='item-row__status-value'>{data.status || '-'}</span>
						</div>

						<div className='item-row__meta-item item-row__meta-item_score'>
							<span className='item-row__meta-label'>Оценка</span>
							<span className='item-row__value'>
								{formatScore(data.score)}
								<FaStar className='item-row__value-icon item-row__value-icon_star' />
							</span>
						</div>

						{hasSpentTime && (
							<div className='item-row__meta-item item-row__meta-item_time'>
								<span className='item-row__meta-label'>Время</span>
								<span className='item-row__value'>
									{formatSpentTime(data.spent_time)}
									<FaClock className='item-row__value-icon' />
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{hasReview && (
				<div className='item-row__review'>
					<div className='item-row__review-title'>Отзыв</div>
					<div className='item-row__review-body'>{data.review}</div>
				</div>
			)}
		</article>
	);
}

export default ItemRow;
