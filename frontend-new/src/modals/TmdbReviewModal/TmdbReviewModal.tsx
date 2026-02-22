import React from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import {useBem} from '@steroidsjs/core/hooks';

import './tmdb-review-modal.scss';

interface ITmdbReviewModalProps extends IModalProps {
	title?: string;
	author?: string;
	publishedAt?: string;
	content?: string;
	url?: string;
}

export default function TmdbReviewModal(props: ITmdbReviewModalProps) {
	const bem = useBem('tmdb-review-modal');
	const {title, author, publishedAt, content, url} = props;

	return (
		<Modal
			{...props}
			size='md'
			className={bem.block()}
			onClose={props.onClose}
			title={title || 'Отзыв пользователя TMDB'}
		>
			<div className={bem.element('meta')}>
				<div className={bem.element('author')} hidden={!author}>{author}</div>
				<div className={bem.element('date')} hidden={!publishedAt}>{publishedAt}</div>
			</div>
			<div className={bem.element('content')}>
				{content || 'Без текста'}
			</div>
			<div className={bem.element('actions')} hidden={!url}>
				<a
					className={bem.element('link')}
					href={url}
					target='_blank'
					rel='noreferrer'
				>
					Открыть на TMDB
				</a>
			</div>
		</Modal>
	);
}
