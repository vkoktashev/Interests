import React from 'react';
import {useBem} from '@steroidsjs/core/hooks';
import {Link} from '@steroidsjs/core/ui/nav';
import {ROUTE_COLLECTION} from '../../routes';
import './collection-card.scss';

interface ICollectionCover {
	type: 'game' | 'movie' | 'show';
	name: string;
	url: string;
}

interface ICollectionCounts {
	games: number;
	movies: number;
	shows: number;
}

export interface ICollection {
	id: number;
	title: string;
	author: {
		id: number | null;
		username: string;
		is_system?: boolean;
	};
	privacy: 'public' | 'private';
	created_at: string;
	updated_at: string;
	counts: ICollectionCounts;
	covers: ICollectionCover[];
	progress?: ICollectionProgress;
}

interface ICollectionProgress {
	completed: number;
	total: number;
	percent: number | null;
}

const COUNT_LABELS = {
	movies: ['фильм', 'фильма', 'фильмов'],
	games: ['игра', 'игры', 'игр'],
	shows: ['сериал', 'сериала', 'сериалов'],
};
function getCountLabel(count: number, forms: string[]) {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;
	let formIndex = 2;

	if (lastTwoDigits < 11 || lastTwoDigits > 14) {
		if (lastDigit === 1) {
			formIndex = 0;
		} else if (lastDigit >= 2 && lastDigit <= 4) {
			formIndex = 1;
		}
	}

	return `${count} ${forms[formIndex]}`;
}

function getCollectionSummary(counts: ICollectionCounts) {
	const parts = [
		counts.movies ? getCountLabel(counts.movies, COUNT_LABELS.movies) : '',
		counts.games ? getCountLabel(counts.games, COUNT_LABELS.games) : '',
		counts.shows ? getCountLabel(counts.shows, COUNT_LABELS.shows) : '',
	].filter(Boolean);

	return parts.length ? parts.join(', ') : 'Пока без контента';
}

function CollectionCard({collection, progressUserId}: {collection: ICollection; progressUserId?: number | string}) {
	const bem = useBem('profile-collections');

	return (
		<Link
			className={bem.element('card')}
			toRoute={ROUTE_COLLECTION}
			toRouteParams={{
				collectionId: collection.id,
				...(progressUserId !== undefined ? {progressUserId} : {}),
			}}
			showQueryParams
		>
			<div className={bem.element('covers', {
				single: collection.covers.length === 1,
				pair: collection.covers.length === 2,
				empty: collection.covers.length === 0,
			})}>
				{collection.covers.length > 0 ? collection.covers.map((cover, index) => (
					<div className={bem.element('cover')} key={`${cover.type}-${index}`}>
						{cover.url ? (
							<img
								className={bem.element('cover-image')}
								src={cover.url}
								alt={cover.name || collection.title}
							/>
						) : (
							<div className={bem.element('cover-placeholder')}>
								{cover.name?.charAt(0).toUpperCase() || '?'}
							</div>
						)}
					</div>
				)) : (
					<div className={bem.element('covers-placeholder')}>Нет обложек</div>
				)}
			</div>

			<div className={bem.element('card-body')}>
				<div className={bem.element('title-row')}>
					<h3 className={bem.element('title')}>{collection.title}</h3>
					{collection.privacy === 'private' && (
						<span className={bem.element('privacy')}>Приватная</span>
					)}
				</div>
				<div className={bem.element('author')}>
					Автор: {collection.author.username}
				</div>
				<div className={bem.element('summary-row')}>
					<div className={bem.element('summary')}>
						{getCollectionSummary(collection.counts)}
					</div>
					{!!collection.progress?.total && collection.progress.percent !== null && (
						<span className={bem.element('progress-value')}>
							{collection.progress.percent}%
						</span>
					)}
				</div>
				{!!collection.progress?.total && collection.progress.percent !== null && (
					<div className={bem.element('progress')}>
						<div className={bem.element('progress-track')}>
							<div
								className={bem.element('progress-fill')}
								style={{width: `${collection.progress.percent}%`}}
							/>
						</div>
					</div>
				)}
			</div>
		</Link>
	);
}

export default CollectionCard;
