import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';

import './tmdb-media-card.scss';

export type ITmdbMediaCardItem = {
	id?: number | string;
	name?: string;
	original_name?: string;
	poster_path?: string;
	backdrop_path?: string;
	release_date?: string;
	vote_average?: number;
	vote_count?: number;
	overview?: string;
	genres?: string;
	platforms?: string;
	tags?: string;
	user_status?: string;
	user_score?: number | null;
};

export type ITmdbMediaCardDetail = {
	label: string;
	value: string;
};

type ITmdbMediaCardProps = {
	item: ITmdbMediaCardItem;
	itemType: 'movie' | 'show' | 'game';
	className?: string;
	details?: ITmdbMediaCardDetail[];
	statusBadge?: {
		label: string;
		tone: 'planned' | 'done' | 'progress' | 'stopped';
	};
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
	const {item, itemType, className, statusBadge, details} = props;

	const href = !item.id
		? '#'
		: itemType === 'game'
			? `/game/${item.id}`
			: `/${itemType}/${item.id}`;
	const titleText = item.name || item.original_name || 'Без названия';
	const imageSrc = item.poster_path || item.backdrop_path || '';
	const providedDetails = (details || []).filter(detail => detail?.label && detail?.value);
	const fallbackDetails: ITmdbMediaCardDetail[] = [
		item.genres ? {label: 'Жанры', value: item.genres} : null,
		item.platforms ? {label: 'Платформы', value: item.platforms} : null,
		item.tags ? {label: 'Теги', value: item.tags} : null,
	].filter(Boolean) as ITmdbMediaCardDetail[];
	const renderDetails = providedDetails.length > 0 ? providedDetails : fallbackDetails;
	const hasDetails = renderDetails.length > 0 || Boolean(item.overview);

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

				{(statusBadge || typeof item.user_score === 'number') && (
					<div className={bem.element('badges')}>
						{statusBadge && (
							<div className={bem.element('badge', {[statusBadge.tone]: true})}>
								{statusBadge.label}
							</div>
						)}
						{typeof item.user_score === 'number' && item.user_score > 0 && (
							<div className={bem.element('badge', {score: true})}>
								{item.user_score}
							</div>
						)}
					</div>
				)}

				{hasDetails && (
					<div className={bem.element('details')}>
						{renderDetails.map((detail, index) => (
							<div key={`${detail.label}-${index}`} className={bem.element('detail-row')}>
								<span className={bem.element('detail-label')}>{detail.label}:</span> {detail.value}
							</div>
						))}
						{!!item.overview && (
							<div className={bem.element('overview')}>
								{item.overview}
							</div>
						)}
					</div>
				)}
			</div>
		</a>
	);
}
