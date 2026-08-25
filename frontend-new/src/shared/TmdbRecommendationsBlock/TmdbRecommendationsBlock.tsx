import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FaChevronDown} from 'react-icons/fa';
import {useBem, useComponents} from '@steroidsjs/core/hooks';
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
	const {http} = useComponents();
	const {
		endpoint,
		itemType,
		title = 'Рекомендации TMDB',
		emptyText = 'Рекомендации TMDB пока недоступны',
		hideWhenEmpty = false,
		className,
		limit = 10,
	} = props;
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [items, setItems] = useState<ITmdbMediaCardItem[]>([]);
	const requestIdRef = useRef(0);

	useEffect(() => {
		requestIdRef.current += 1;
		setIsOpen(false);
		setIsLoading(false);
		setHasLoaded(false);
		setHasError(false);
		setItems([]);
	}, [endpoint]);

	const loadRecommendations = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setIsLoading(true);
		setHasError(false);

		try {
			const response = await http.get(endpoint) as {results?: ITmdbMediaCardItem[]};
			if (requestId === requestIdRef.current) {
				setItems(Array.isArray(response?.results) ? response.results : []);
				setHasLoaded(true);
			}
		} catch (error) {
			if (requestId === requestIdRef.current) {
				setHasError(true);
				setHasLoaded(true);
			}
		} finally {
			if (requestId === requestIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [endpoint, http]);

	const toggleRecommendations = useCallback(() => {
		const shouldOpen = !isOpen;
		setIsOpen(shouldOpen);
		if (shouldOpen) {
			loadRecommendations();
		}
	}, [isOpen, loadRecommendations]);

	const shouldHide = hideWhenEmpty && hasLoaded && !hasError && items.length < 1;

	if (shouldHide) {
		return null;
	}

	return (
		<section className={[bem.block(), className].filter(Boolean).join(' ')}>
			<button
				type='button'
				className={bem.element('toggle')}
				onClick={toggleRecommendations}
				aria-expanded={isOpen}
			>
				<span>{title}</span>
				<FaChevronDown className={bem.element('icon', {open: isOpen})} />
			</button>

			{isOpen && (
				<div className={bem.element('content')}>
					<div className={bem.element('content-inner')}>
						{isLoading && items.length < 1 && (
							<div className={bem.element('empty')}>Загрузка рекомендаций...</div>
						)}
						{hasError && (
							<div className={bem.element('empty')}>Не удалось загрузить рекомендации</div>
						)}
						{!isLoading && !hasError && items.length < 1 && (
							<div className={bem.element('empty')}>{emptyText}</div>
						)}
						{items.length > 0 && (
							<div className={bem.element('grid')}>
								{items.slice(0, limit).map((item, index) => (
									<TmdbMediaCard
										key={`${itemType}-${item.id || index}`}
										item={item}
										itemType={itemType}
										className={bem.element('card')}
									/>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</section>
	);
}
