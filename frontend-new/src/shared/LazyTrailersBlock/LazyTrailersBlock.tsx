import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FaChevronDown} from 'react-icons/fa';
import {useBem, useComponents} from '@steroidsjs/core/hooks';

import MediaGalleryBlock from '../MediaGalleryBlock';

import './lazy-trailers-block.scss';

type TTrailer = {
	external_id?: string;
	name?: string;
	url?: string;
	source?: string;
	platform?: string;
	type?: string;
};

interface ILazyTrailersBlockProps {
	className?: string;
	endpoint: string;
	isMobileViewport?: boolean;
}

export default function LazyTrailersBlock(props: ILazyTrailersBlockProps) {
	const bem = useBem('lazy-trailers-block');
	const {http} = useComponents();
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [trailers, setTrailers] = useState<TTrailer[]>([]);
	const [hasError, setHasError] = useState(false);
	const requestIdRef = useRef(0);

	useEffect(() => {
		requestIdRef.current += 1;
		setIsOpen(false);
		setIsLoading(false);
		setTrailers([]);
		setHasError(false);
	}, [props.endpoint]);

	const loadTrailers = useCallback(async () => {
		const requestId = ++requestIdRef.current;
		setIsLoading(true);
		setHasError(false);

		try {
			const response = await http.get(props.endpoint) as TTrailer[];
			if (requestId === requestIdRef.current) {
				setTrailers(Array.isArray(response) ? response : []);
			}
		} catch (error) {
			if (requestId === requestIdRef.current) {
				setHasError(true);
			}
		} finally {
			if (requestId === requestIdRef.current) {
				setIsLoading(false);
			}
		}
	}, [http, props.endpoint]);

	const toggleTrailers = useCallback(() => {
		const shouldOpen = !isOpen;
		setIsOpen(shouldOpen);
		if (shouldOpen) {
			loadTrailers();
		}
	}, [isOpen, loadTrailers]);

	if (props.isMobileViewport) {
		return null;
	}

	return (
		<section className={[bem.block(), props.className].filter(Boolean).join(' ')}>
			<button
				type='button'
				className={bem.element('toggle')}
				onClick={toggleTrailers}
				aria-expanded={isOpen}
			>
				<span>{isOpen ? 'Скрыть трейлеры' : 'Показать трейлеры'}</span>
				<FaChevronDown className={bem.element('icon', {open: isOpen})} />
			</button>

			{isOpen && (
				<div className={bem.element('content')}>
					<div className={bem.element('content-inner')}>
						{isLoading && trailers.length < 1 && (
							<div className={bem.element('message')}>Загрузка трейлеров...</div>
						)}
						{hasError && (
							<div className={bem.element('message', {error: true})}>
								Не удалось загрузить трейлеры
							</div>
						)}
						{!isLoading && !hasError && trailers.length < 1 && (
							<div className={bem.element('message')}>Трейлеры не найдены</div>
						)}
						{trailers.length > 0 && (
							<MediaGalleryBlock
								className={bem.element('gallery')}
								trailers={trailers}
							/>
						)}
					</div>
				</div>
			)}
		</section>
	);
}
