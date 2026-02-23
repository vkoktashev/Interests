import React, {useMemo} from 'react';
import LoadingOverlay from 'react-loading-overlay';
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import TmdbMediaCard, {ITmdbMediaCardItem} from '../TmdbMediaCard/TmdbMediaCard';

import './tmdb-recommendations-block.scss';

type ITmdbRecommendationsBlockProps = {
	endpoint: string;
	itemType: 'movie' | 'show';
	title?: string;
	emptyText?: string;
	hideWhenEmpty?: boolean;
	className?: string;
	limit?: number;
};

export default function TmdbRecommendationsBlock(props: ITmdbRecommendationsBlockProps) {
	const bem = useBem('tmdb-recommendations-block');
	const {
		endpoint,
		itemType,
		title = 'Рекомендации TMDB',
		emptyText = 'Рекомендации TMDB пока недоступны',
		hideWhenEmpty = true,
		className,
		limit = 10,
	} = props;

	const fetchConfig = useMemo(() => endpoint ? ({
		url: endpoint,
		method: 'get',
	}) : null, [endpoint]);
	const {data, isLoading} = useFetch(fetchConfig);

	const items = useMemo<ITmdbMediaCardItem[]>(() => data?.results || [], [data]);
	const shouldHide = hideWhenEmpty && !isLoading && items.length < 1;

	if (shouldHide) {
		return null;
	}

	return (
		<section className={[bem.block(), className].filter(Boolean).join(' ')}>
			<h4 className={bem.element('title')}>{title}</h4>
			<LoadingOverlay active={isLoading} spinner text='Загрузка...'>
				<div className={bem.element('grid')}>
					{items.length > 0 ? items.slice(0, limit).map((item, index) => (
						<TmdbMediaCard
							key={`${itemType}-${item.id || index}`}
							item={item}
							itemType={itemType}
							className={bem.element('card')}
						/>
					)) : (
						<div className={bem.element('empty')}>{emptyText}</div>
					)}
				</div>
			</LoadingOverlay>
		</section>
	);
}
