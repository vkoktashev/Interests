import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';

import './tmdb-media-card.scss';

export type ITmdbMediaCardItem = {
	id?: number;
	name?: string;
	original_name?: string;
	poster_path?: string;
	backdrop_path?: string;
	release_date?: string;
	vote_average?: number;
	vote_count?: number;
	overview?: string;
};

type ITmdbMediaCardProps = {
	item: ITmdbMediaCardItem;
	itemType: 'movie' | 'show';
	className?: string;
};

function formatDate(value?: string) {
	if (!value) {
		return 'Дата неизвестна';
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return parsed.toLocaleDateString('ru-RU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
}

function formatScore(value?: number) {
	if (typeof value !== 'number') {
		return '—';
	}
	return value.toFixed(1);
}

export default function TmdbMediaCard(props: ITmdbMediaCardProps) {
	const bem = useBem('tmdb-media-card');
	const {item, itemType, className} = props;

	const href = item.id ? `/${itemType}/${item.id}` : '#';
	const titleText = item.name || item.original_name || 'Без названия';
	const imageSrc = item.poster_path || item.backdrop_path || '';

	return (
		<a className={[bem.block(), className].filter(Boolean).join(' ')} href={href}>
			<div className={bem.element('poster')}>
				{imageSrc ? (
					<img src={imageSrc} alt={titleText} className={bem.element('poster-img')} />
				) : (
					<div className={bem.element('poster-fallback')}>
						{titleText.charAt(0).toUpperCase()}
					</div>
				)}
			</div>

			<div className={bem.element('body')}>
				<div className={bem.element('top')}>
					<div className={bem.element('name')} title={titleText}>{titleText}</div>
					<div className={bem.element('score')}>{formatScore(item.vote_average)}</div>
				</div>

				<div className={bem.element('meta')}>
					<span>{formatDate(item.release_date)}</span>
					{!!item.vote_count && <span>{item.vote_count} оценок</span>}
				</div>

				{!!item.overview && (
					<div className={bem.element('overview')}>
						{item.overview}
					</div>
				)}
			</div>
		</a>
	);
}
