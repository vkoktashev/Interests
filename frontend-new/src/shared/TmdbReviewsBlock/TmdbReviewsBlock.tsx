import React, {useMemo} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import {openModal} from '@steroidsjs/core/actions/modal';
import {useBem, useDispatch, useFetch} from '@steroidsjs/core/hooks';
import TmdbReviewModal from '../../modals/TmdbReviewModal/TmdbReviewModal';
import {getDefaultAvatarUrl} from '../avatar';

import './tmdb-reviews-block.scss';

type ITmdbReview = {
	id?: string;
	author?: string;
	rating?: number | null;
	content?: string;
	url?: string;
	created_at?: string;
	avatar_path?: string;
	username?: string;
};

type ITmdbReviewsBlockProps = {
	endpoint: string;
	title?: string;
	emptyText?: string;
	hideWhenEmpty?: boolean;
	className?: string;
};

const PREVIEW_LIMIT = 320;

export default function TmdbReviewsBlock(props: ITmdbReviewsBlockProps) {
	const bem = useBem('tmdb-reviews-block');
	const dispatch = useDispatch();
	const {
		endpoint,
		title = 'Отзывы пользователей TMDB',
		emptyText = 'Пользовательских отзывов TMDB пока нет',
		hideWhenEmpty = true,
		className,
	} = props;
	const fetchConfig = useMemo(() => endpoint ? ({
		url: endpoint,
		method: 'get',
	}) : null, [endpoint]);
	const {data, isLoading} = useFetch(fetchConfig);

	const reviews = useMemo<ITmdbReview[]>(() => data?.results || [], [data]);
	const shouldHide = hideWhenEmpty && !isLoading && reviews.length < 1;
	const rootClassName = [bem.block({empty: !isLoading && reviews.length < 1}), className]
		.filter(Boolean)
		.join(' ');

	if (shouldHide) {
		return null;
	}

	const formatDate = (value?: string) => {
		if (!value) {
			return '';
		}
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			return '';
		}
		return parsed.toLocaleDateString('ru-RU', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	};

	const getAvatarUrl = (review: ITmdbReview) => {
		const avatarPath = String(review.avatar_path || '').trim();
		if (avatarPath) {
			if (/^https?:\/\//i.test(avatarPath)) {
				return avatarPath;
			}
			if (avatarPath.startsWith('/')) {
				return `https://image.tmdb.org/t/p/w185${avatarPath}`;
			}
		}
		return getDefaultAvatarUrl(review.username || review.author || 'tmdb-user');
	};

	return (
		<section className={rootClassName}>
			<h4 className={bem.element('title')}>{title}</h4>
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
				<div className={bem.element('list')}>
					{reviews.length > 0 ? reviews.slice(0, 5).map((review, index) => {
						const key = String(review.id || review.url || index);
						const content = String(review.content || '');
						const canExpand = content.length > PREVIEW_LIMIT;
						const previewText = canExpand
							? `${content.slice(0, PREVIEW_LIMIT).trimEnd()}...`
							: content;
						const publishedAt = formatDate(review.created_at);

						return (
							<div key={key} className={bem.element('item')}>
								<div className={bem.element('head')}>
									<div className={bem.element('author-wrap')}>
										<img
											className={bem.element('avatar')}
											src={getAvatarUrl(review)}
											alt={review.author || 'TMDB user'}
										/>
										<div className={bem.element('author')}>{review.author || 'TMDB user'}</div>
									</div>
									{typeof review.rating === 'number' && (
										<div className={bem.element('rating')}>Оценка {review.rating}/10</div>
									)}
								</div>

								<div className={bem.element('meta')} hidden={!publishedAt}>
									Опубликовано: {publishedAt}
								</div>

								<div className={bem.element('content')}>
									{previewText || 'Без текста'}
								</div>

								<div className={bem.element('actions')}>
									<button
										type='button'
										className={bem.element('toggle')}
										hidden={!canExpand}
										onClick={() => dispatch(openModal(TmdbReviewModal, {
											title: 'Отзыв пользователя TMDB',
											author: review.author || 'TMDB user',
											publishedAt: publishedAt ? `Опубликовано: ${publishedAt}` : '',
											content,
											url: review.url || '',
										}))}
									>
										Читать полностью
									</button>
									{review.url && (
										<a
											className={bem.element('link')}
											href={review.url}
											target='_blank'
											rel='noreferrer'
										>
											Открыть на TMDB
										</a>
									)}
								</div>
							</div>
						);
					}) : (
						<div className={bem.element('empty')}>{emptyText}</div>
					)}
				</div>
			</LoadingOverlay>
		</section>
	);
}
